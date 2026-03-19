#!/usr/bin/env node
/**
 * Schema guardrail: checks prisma/schema.prisma for common issues.
 *
 * Catches:
 *   - duplicate model definitions
 *   - duplicate enum definitions
 *   - duplicate @@map values (two models mapping to the same table)
 *
 * Usage:
 *   node scripts/check-schema.js
 *
 * Returns exit code 1 if any issues found (safe for CI / pre-commit).
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');

function checkSchema() {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const lines = content.split('\n');

  const models = [];    // { name, line }
  const enums = [];     // { name, line }
  const mapValues = []; // { name, mapTo, line }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Match model definitions
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      models.push({ name: modelMatch[1], line: lineNum });
    }

    // Match enum definitions
    const enumMatch = line.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      enums.push({ name: enumMatch[1], line: lineNum });
    }

    // Match @@map directives
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch) {
      // Find which model/enum this belongs to
      let owner = '(unknown)';
      for (let j = models.length - 1; j >= 0; j--) {
        if (models[j].line < lineNum) { owner = models[j].name; break; }
      }
      mapValues.push({ name: owner, mapTo: mapMatch[1], line: lineNum });
    }
  }

  const issues = [];

  // Check duplicate models
  const modelNames = {};
  for (const m of models) {
    if (modelNames[m.name]) {
      issues.push(`DUPLICATE MODEL: "${m.name}" defined at line ${modelNames[m.name]} and line ${m.line}`);
    }
    modelNames[m.name] = m.line;
  }

  // Check duplicate enums
  const enumNames = {};
  for (const e of enums) {
    if (enumNames[e.name]) {
      issues.push(`DUPLICATE ENUM: "${e.name}" defined at line ${enumNames[e.name]} and line ${e.line}`);
    }
    enumNames[e.name] = e.line;
  }

  // Check duplicate @@map values
  const mapTargets = {};
  for (const m of mapValues) {
    if (mapTargets[m.mapTo]) {
      issues.push(`DUPLICATE TABLE MAP: "${m.mapTo}" used by model "${mapTargets[m.mapTo].name}" (line ${mapTargets[m.mapTo].line}) and "${m.name}" (line ${m.line})`);
    }
    mapTargets[m.mapTo] = m;
  }

  // Report
  console.log(`Checked ${models.length} models, ${enums.length} enums, ${mapValues.length} @@map directives`);

  if (issues.length === 0) {
    console.log('✓ No issues found');
    return 0;
  }

  console.error('\n✗ SCHEMA ISSUES FOUND:\n');
  for (const issue of issues) {
    console.error(`  ${issue}`);
  }
  console.error('');
  return 1;
}

process.exit(checkSchema());
