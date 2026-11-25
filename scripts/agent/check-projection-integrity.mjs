import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync(new URL('../../agent-commons.lock.json', import.meta.url), 'utf8'));
const path = 'scripts/agent/verify-projection.js';
const expected = lock.outputs[path];
const actual = 'sha256:' + createHash('sha256').update(readFileSync(new URL('./verify-projection.js', import.meta.url))).digest('hex');
if (actual !== expected) throw new Error('Projection guard hash mismatch');
console.log('Projection guard hash OK');
