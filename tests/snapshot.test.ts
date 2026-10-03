import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { SnapshotManager } from '../src/core/snapshot/snapshotManager.js';

const SNAP_TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'snap-test');

describe('Snapshot & Rollback Engine', () => {
  beforeEach(async () => {
    await fs.ensureDir(SNAP_TEST_DIR);
    await fs.writeFile(path.join(SNAP_TEST_DIR, 'file1.txt'), 'Original content 1');
    await fs.writeFile(path.join(SNAP_TEST_DIR, 'file2.txt'), 'Original content 2');
  });

  afterEach(async () => {
    await fs.remove(SNAP_TEST_DIR);
  });

  it('should create snapshot, list snapshots, and rollback changes', async () => {
    const manager = new SnapshotManager(SNAP_TEST_DIR);

    // 1. Create snapshot
    const snap = await manager.createSnapshot('Initial state');
    expect(snap.id).toBeDefined();
    expect(snap.fileCount).toBe(2);

    // 2. Modify files
    await fs.writeFile(path.join(SNAP_TEST_DIR, 'file1.txt'), 'Mutated content!');
    await fs.remove(path.join(SNAP_TEST_DIR, 'file2.txt'));

    // 3. Rollback
    const rollbackRes = await manager.rollback(snap.id);
    expect(rollbackRes.restoredId).toBe(snap.id);

    // Verify files restored
    const content1 = await fs.readFile(path.join(SNAP_TEST_DIR, 'file1.txt'), 'utf-8');
    const exists2 = await fs.pathExists(path.join(SNAP_TEST_DIR, 'file2.txt'));

    expect(content1).toBe('Original content 1');
    expect(exists2).toBe(true);
  });
});
