import Ajv from "ajv";
import { parse } from "yaml";

const string = { type: "string", minLength: 1 };
const validations = {
  type: "object", additionalProperties: false,
  properties: { required: { type: "boolean" } },
};
const field = (type, attributes, required) => ({
  type: "object", additionalProperties: false, required: ["type", "id", "attributes"],
  properties: {
    type: { const: type },
    id: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
    attributes: {
      type: "object", additionalProperties: false, required,
      properties: { label: string, description: string, ...attributes },
    },
    validations,
  },
});
const schema = {
  type: "object", additionalProperties: false, required: ["name", "description", "body"],
  properties: {
    name: string, description: string, title: string,
    body: {
      type: "array", minItems: 2,
      items: {
        oneOf: [
          {
            type: "object", additionalProperties: false, required: ["type", "attributes"],
            properties: {
              type: { const: "markdown" },
              attributes: {
                type: "object", additionalProperties: false, required: ["value"],
                properties: { value: string },
              },
            },
          },
          field("textarea", { placeholder: string, value: string }, ["label"]),
          field("dropdown", {
            options: { type: "array", minItems: 1, uniqueItems: true, items: string },
            default: { type: "integer", minimum: 0 },
            multiple: { type: "boolean" },
          }, ["label", "options"]),
        ],
      },
    },
  },
};
const ajv = new Ajv({ allErrors: true });
const check = ajv.compile(schema);

export function validateIssueForm(source) {
  const form = parse(source);
  if (!check(form)) throw new Error(`Invalid issue form: ${ajv.errorsText(check.errors)}`);
  const ids = new Set();
  const labels = new Set();
  for (const item of form.body) {
    if (item.type === "markdown") continue;
    if (ids.has(item.id)) throw new Error(`Duplicate issue form id: ${item.id}`);
    if (labels.has(item.attributes.label)) throw new Error(`Duplicate issue form label: ${item.attributes.label}`);
    ids.add(item.id);
    labels.add(item.attributes.label);
    if (item.type === "dropdown" && item.attributes.default >= item.attributes.options.length) {
      throw new Error(`Dropdown default is outside its options: ${item.id}`);
    }
  }
  if (!ids.size) throw new Error("Issue form must contain an input");
  return form;
}
