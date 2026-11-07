import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stringify } from "yaml";
import { validateIssueForm } from "../lib/issue-form.mjs";

const source = readFileSync(new URL("../../.github/ISSUE_TEMPLATE/task-contract.yml", import.meta.url), "utf8");

test("task contract has four outcome fields and requires only the first three", () => {
  const form = validateIssueForm(source);
  const fields = form.body.filter(item => item.type !== "markdown");
  assert.deepEqual(fields.map(item => [item.type, item.attributes.label, item.validations?.required === true]), [
    ["textarea", "Goal", true],
    ["textarea", "Scope and constraints", true],
    ["textarea", "Acceptance checks", true],
    ["textarea", "Context and open questions", false],
  ]);
  assert.equal(form.body[0].attributes.value.trim(),
    "Describe outcomes, not implementation steps. Leave unknown tooling for the agent to discover.");
  for (const item of fields) {
    assert.doesNotMatch(`${item.attributes.description}\n${item.attributes.placeholder}`, /command|readiness|working director|exit code/i);
  }
});

test("issue form validation rejects malformed YAML and unusable field definitions", () => {
  assert.throws(() => validateIssueForm("name: [\n"), /YAML|flow sequence/i);
  for (const mutate of [
    form => { form.body[1].validations.required = "true"; },
    form => { delete form.body[1].attributes.label; },
    form => { form.body[1].type = "text"; },
  ]) {
    const form = validateIssueForm(source);
    mutate(form);
    assert.throws(() => validateIssueForm(stringify(form)), /Invalid issue form/);
  }
});

test("issue form validation rejects ambiguous answers and invalid dropdown defaults", () => {
  for (const [mutate, error] of [
    [form => { form.body[2].id = form.body[1].id; }, /Duplicate issue form id/],
    [form => { form.body[2].attributes.label = form.body[1].attributes.label; }, /Duplicate issue form label/],
    [form => { form.body.push({
      type: "dropdown", id: "example", attributes: { label: "Example", options: ["One", "Two"], default: 2 },
    }); }, /Dropdown default/],
    [form => { form.body = [form.body[0], form.body[0]]; }, /must contain an input/],
  ]) {
    const form = validateIssueForm(source);
    mutate(form);
    assert.throws(() => validateIssueForm(stringify(form)), error);
  }
});
