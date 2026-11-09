import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { MigrationRunner } from '../src/database/MigrationRunner.ts';

test('Database Schema Evolution: Multi-Version Upgrades', async (t) => {
  const db = new DatabaseSync(':memory:');
  const runner = new MigrationRunner(db);

  await t.test('applies all 3 schema versions sequentially', () => {
    runner.runAll();
    const applied = runner.getAppliedMigrations();
    assert.equal(applied.length, 3, 'All 3 migrations must be recorded');
    assert.equal(applied[0].version, 1);
    assert.equal(applied[1].version, 2);
    assert.equal(applied[2].version, 3);
  });

  await t.test('timeline reports detailed rationale and performance impact', () => {
    const timeline = runner.getMigrationTimeline();
    assert.equal(timeline.length, 3);
    assert.ok(timeline[1].performance_impact.includes('Reduces account statement query latency'));
    assert.ok(timeline[2].rationale.includes('zero read/write downtime'));
  });
});
