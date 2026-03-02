#!/usr/bin/env node

/**
 * Updates design token references after namespacing primitive/semantic tokens.
 *
 * Handles two reference types:
 *   - Curly brace aliases:  "{typography.weight.bold}" -> "{primitive.typography.weight.bold}"
 *   - JSON Pointer $ref:    "#/typography/weight/bold/$value" -> "#/primitive/typography/weight/bold/$value"
 *
 * Usage:
 *   node scripts/update-references.js              # dry-run (preview changes)
 *   node scripts/update-references.js --apply      # write changes to disk
 */

const fs = require("fs");
const path = require("path");

const TOKEN_ROOT = path.resolve(
  __dirname,
  "../json/tokens/canonical"
);

const DRY_RUN = !process.argv.includes("--apply");

// ---------------------------------------------------------------------------
// Mapping rules
// ---------------------------------------------------------------------------
// Each rule: [matchPrefix, namespace]
// Rules are checked top-to-bottom; first match wins.
// The prefix is compared against the *start* of the reference path
// (dot-separated for curly braces, slash-separated for JSON pointers).

const CURLY_BRACE_RULES = [
  // dimension & number — all primitive
  ["dimension.", "primitive"],
  ["number.", "primitive"],

  // color sub-groups
  ["color.palette.", "primitive"],
  // everything else under color is semantic
  ["color.", "semantic"],

  // typography — specific sub-groups
  ["typography.fontFamily.sansSerif", "primitive"],
  ["typography.fontFamily.monospace", "primitive"],
  ["typography.fontFamily.default", "semantic"],
  ["typography.fontFamily.code", "semantic"],
  ["typography.weight.", "primitive"],
  ["typography.letterCase.", "primitive"],
  ["typography.figureStyle.", "primitive"],
  ["typography.fontStyle.", "primitive"],
  ["typography.fontPosition.", "primitive"],
  ["typography.textDecoration.", "primitive"],
  ["typography.text.", "semantic"],
  ["typography.heading.", "semantic"],
];

// Same rules but with `/` separators for JSON pointer paths (after `#/`)
const JSON_POINTER_RULES = CURLY_BRACE_RULES.map(([prefix, ns]) => [
  prefix.replace(/\./g, "/"),
  ns,
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTokenFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTokenFiles(full));
    } else if (entry.name.endsWith(".tokens.json")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Given a reference path (dot or slash separated) and the corresponding
 * rule list, return the namespaced version or null if no rule matches.
 */
function applyRules(refPath, rules, sep) {
  // Skip if already namespaced
  if (refPath.startsWith(`primitive${sep}`) || refPath.startsWith(`semantic${sep}`)) {
    return null;
  }
  for (const [prefix, ns] of rules) {
    if (refPath.startsWith(prefix) || refPath === prefix.replace(/\/$/, "")) {
      return `${ns}${sep}${refPath}`;
    }
  }
  return null; // no matching rule
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf-8");
  let content = original;
  const changes = [];

  // 1. Curly brace references: "{path.to.token}"
  //    These appear as string values like "{typography.weight.bold}"
  content = content.replace(/\{([a-zA-Z][a-zA-Z0-9$.]*)\}/g, (match, refPath) => {
    const updated = applyRules(refPath, CURLY_BRACE_RULES, ".");
    if (updated) {
      changes.push({ type: "alias", old: match, new: `{${updated}}` });
      return `{${updated}}`;
    }
    return match;
  });

  // 2. JSON Pointer $ref values: "#/path/to/token/..."
  content = content.replace(
    /("\$ref"\s*:\s*"#\/)([^"]+)(")/g,
    (match, prefix, pointerPath, suffix) => {
      const updated = applyRules(pointerPath, JSON_POINTER_RULES, "/");
      if (updated) {
        changes.push({
          type: "$ref",
          old: `#/${pointerPath}`,
          new: `#/${updated}`,
        });
        return `${prefix}${updated}${suffix}`;
      }
      return match;
    }
  );

  return { content, changes, modified: content !== original };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = findTokenFiles(TOKEN_ROOT);
let totalChanges = 0;
let modifiedFiles = 0;

console.log(DRY_RUN ? "\n=== DRY RUN (pass --apply to write) ===\n" : "\n=== APPLYING CHANGES ===\n");

for (const file of files) {
  const rel = path.relative(TOKEN_ROOT, file);
  const { content, changes, modified } = processFile(file);

  if (!modified) continue;

  modifiedFiles++;
  totalChanges += changes.length;

  console.log(`\n${rel}  (${changes.length} changes)`);
  for (const c of changes) {
    console.log(`  ${c.type.padEnd(6)} ${c.old}`);
    console.log(`       → ${c.new}`);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(file, content, "utf-8");
  }
}

console.log(`\n--- Summary ---`);
console.log(`Files scanned:  ${files.length}`);
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Total changes:  ${totalChanges}`);
if (DRY_RUN) {
  console.log(`\nNo files were written. Run with --apply to save changes.`);
}
