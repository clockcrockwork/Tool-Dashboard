#!/usr/bin/env node
// <!-- agent-commons:generated source=system-qa-receipt-check version=1.5.0 — 手編集しない。正本は agent-commons/core と docs/agent-workflows/overlays -->
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const methods = new Set(['e2e', 'manual', 'exploratory']);
const statuses = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN']);
const kinds = new Set(['defect', 'question', 'blocker']);

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueRows(rows, key, label) {
  requireThat(Array.isArray(rows), label + ' must be an array');
  const index = new Map();
  for (const row of rows) {
    requireThat(object(row) && nonempty(row[key]), label + ' contains an invalid ' + key);
    requireThat(!index.has(row[key]), label + ' contains duplicate ID ' + row[key]);
    index.set(row[key], row);
  }
  return index;
}

function refs(ids, index, label) {
  requireThat(Array.isArray(ids) && ids.length > 0, label + ' requires scopeIds');
  requireThat(ids.every((id) => nonempty(id) && index.has(id)), label + ' contains an unknown scope ID');
  requireThat(new Set(ids).size === ids.length, label + ' contains duplicate scope IDs');
}

export function assessReceipt(receipt, expectedTarget, expectedBasis) {
  requireThat(nonempty(expectedTarget) && nonempty(expectedBasis), 'independent expected revisions are required');
  requireThat(object(receipt) && receipt.schemaVersion === 1, 'unsupported receipt schema');
  requireThat(receipt.targetRevision === expectedTarget && receipt.basisRevision === expectedBasis,
    'receipt revision mismatch');
  requireThat(nonempty(receipt.environment), 'environment identity is required');

  const scope = uniqueRows(receipt.scope, 'id', 'scope');
  requireThat(scope.size > 0, 'scope cannot be empty');
  for (const [id, item] of scope) {
    requireThat(nonempty(item.source) && nonempty(item.risk), id + ' requires source and risk');
  }
  const checks = uniqueRows(receipt.checks, 'id', 'checks');
  const covered = new Set();
  for (const [id, check] of checks) {
    refs(check.scopeIds, scope, id);
    requireThat(methods.has(check.method) && nonempty(check.expected), id + ' requires method and expected behavior');
    for (const scopeId of check.scopeIds) covered.add(scopeId);
  }
  const results = uniqueRows(receipt.results, 'checkId', 'results');
  for (const [id, result] of results) {
    requireThat(checks.has(id), 'unknown check result ' + id);
    requireThat(statuses.has(result.status), id + ' has invalid status');
    requireThat(nonempty(result.basisRevision) && nonempty(result.targetRevision), id + ' requires result revisions');
    if (result.status === 'PASS' || result.status === 'FAIL') {
      requireThat(nonempty(result.observed) && Array.isArray(result.evidence) &&
        result.evidence.length > 0 && result.evidence.every(nonempty), id + ' requires observation and evidence');
    } else {
      requireThat(nonempty(result.reason), id + ' requires reason');
    }
  }
  const openItems = uniqueRows(receipt.openItems, 'id', 'openItems');
  for (const [id, item] of openItems) {
    refs(item.scopeIds, scope, id);
    requireThat(kinds.has(item.kind) && nonempty(item.summary) && nonempty(item.reference),
      id + ' requires kind, summary and reference');
  }

  const unmappedScope = [...scope.keys()].filter((id) => !covered.has(id));
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_RUN: 0, STALE: 0 };
  const pending = [];
  for (const id of checks.keys()) {
    const result = results.get(id);
    let status = result?.status ?? 'NOT_RUN';
    if (result && (result.basisRevision !== expectedBasis || result.targetRevision !== expectedTarget)) status = 'STALE';
    counts[status] += 1;
    if (status !== 'PASS') pending.push({ checkId: id, status });
  }
  const complete = unmappedScope.length === 0 && pending.length === 0 && openItems.size === 0;
  return {
    status: complete ? 'RECEIPT_COMPLETE' : 'HOLD',
    scopeCount: scope.size,
    plannedChecks: checks.size,
    counts,
    unmappedScope,
    pending,
    openItemIds: [...openItems.keys()],
    evidenceVerified: false,
  };
}

function main() {
  try {
    const args = process.argv.slice(2);
    requireThat(args.length === 3, 'usage: check-system-qa <receipt-path> <expected-target-revision> <expected-basis-revision>');
    const [file, target, basis] = args;
    const result = assessReceipt(JSON.parse(readFileSync(file, 'utf8')), target, basis);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'RECEIPT_COMPLETE' ? 0 : 2;
  } catch (error) {
    console.error('INVALID: ' + error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
