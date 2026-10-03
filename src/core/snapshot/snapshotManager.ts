import fs from 'fs-extra';
import path from 'path';
import { getProjectFiles } from '../../utils/fileUtils.js';

export interface SnapshotMeta {
  id: string;
  timestamp: string;
  description: string;
  fileCount: number;
}

/**
 * Manages atomic project snapshots for instantaneous zero-risk rollback
 */
export class SnapshotManager {
  private snapshotDir: string;

  constructor(private rootDir: string) {
    this.snapshotDir = path.join(rootDir, '.shipai', 'snapshots');
  }

  /**
   * Creates an atomic snapshot of all source and configuration files in the project
   */
  async createSnapshot(description = 'Pre-transformation checkpoint'): Promise<SnapshotMeta> {
    const id = `snap-${Date.now()}`;
    const targetPath = path.join(this.snapshotDir, id);
    await fs.ensureDir(targetPath);

    const files = await getProjectFiles(this.rootDir, ['.shipai/**']);

    for (const f of files) {
      const dest = path.join(targetPath, f.relativePath);
      await fs.ensureDir(path.dirname(dest));
      await fs.copyFile(f.filePath, dest);
    }

    const meta: SnapshotMeta = {
      id,
      timestamp: new Date().toISOString(),
      description,
      fileCount: files.length
    };

    await fs.writeJson(path.join(targetPath, 'manifest.json'), meta, { spaces: 2 });
    return meta;
  }

  /**
   * Lists all existing snapshots
   */
  async listSnapshots(): Promise<SnapshotMeta[]> {
    if (!(await fs.pathExists(this.snapshotDir))) {
      return [];
    }

    const dirs = await fs.readdir(this.snapshotDir);
    const snapshots: SnapshotMeta[] = [];

    for (const d of dirs) {
      const manifestPath = path.join(this.snapshotDir, d, 'manifest.json');
      if (await fs.pathExists(manifestPath)) {
        try {
          const meta = await fs.readJson(manifestPath);
          snapshots.push(meta);
        } catch {}
      }
    }

    return snapshots.sort((a, b) => b.id.localeCompare(a.id));
  }

  /**
   * Restores the project to an exact previous snapshot state
   */
  async rollback(snapshotId?: string): Promise<{ restoredId: string; fileCount: number }> {
    const snapshots = await this.listSnapshots();
    if (snapshots.length === 0) {
      throw new Error('No snapshots found to rollback to.');
    }

    const targetSnapshot = snapshotId
      ? snapshots.find(s => s.id === snapshotId)
      : snapshots[0]; // Most recent

    if (!targetSnapshot) {
      throw new Error(`Snapshot with id "${snapshotId}" not found.`);
    }

    const sourcePath = path.join(this.snapshotDir, targetSnapshot.id);
    const snapFiles = await getProjectFiles(sourcePath, ['manifest.json']);

    for (const f of snapFiles) {
      const dest = path.join(this.rootDir, f.relativePath);
      await fs.ensureDir(path.dirname(dest));
      await fs.copyFile(f.filePath, dest);
    }

    return { restoredId: targetSnapshot.id, fileCount: snapFiles.length };
  }
}
