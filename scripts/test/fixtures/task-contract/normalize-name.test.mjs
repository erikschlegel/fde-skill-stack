import test from "node:test";
import assert from "node:assert/strict";
import { normalizeName } from "./normalize-name.mjs";

test("normalization trims edges without changing internal whitespace", () => {
  assert.equal(normalizeName("  Ada   Lovelace \n"), "Ada   Lovelace");
  assert.equal(normalizeName(""), "");
  assert.equal(normalizeName(" \t "), "");
});
