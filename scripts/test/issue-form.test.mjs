import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stringify } from "yaml";
import { validateIssueForm } from "../lib/issue-form.mjs";

const source = readFileSync(new URL("../../.github/ISSUE_TEMPLATE/task-contract.yml", import.meta.url), "utf8");

test("task contract accepts command discovery and exposes editable Markdown answer fields", () => {
  const form = validateIssueForm(source);
  const fields = form.body.filter(item => item.type !== "markdown");
  assert.deepEqual(fields.filter(item => item.validations?.required).map(item => item.id), [
    "goal", "scope", "acceptance-criteria", "verification-scenarios", "verification-commands",
    "command-readiness", "evidence-requirements", "unresolved-decisions",
  ]);
  const commands = fields.find(item => item.id === "verification-commands");
  commands.attributes.value = "UNKNOWN: discover the project's focused test command.";
  assert.equal(validateIssueForm(stringify(form)).body.find(item => item.id === commands.id).attributes.value,
    commands.attributes.value);
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
    [form => { form.body.find(item => item.type === "dropdown").attributes.default = 2; }, /Dropdown default/],
    [form => { form.body = [form.body[0], form.body[0]]; }, /must contain an input/],
  ]) {
    const form = validateIssueForm(source);
    mutate(form);
    assert.throws(() => validateIssueForm(stringify(form)), error);
  }
});
