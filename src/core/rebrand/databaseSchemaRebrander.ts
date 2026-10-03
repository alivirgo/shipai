import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { buildCasingMatrix } from './casingMatrix.js';
import { readTextFile, writeTextFile } from '../../utils/fileUtils.js';

export interface DbRebrandResult {
  updatedSchemaFiles: string[];
}

/**
 * Rebrands database connection strings, Prisma schemas, and migration files
 */
export async function rebrandDatabaseSchemas(
  rootDir: string,
  sourceName: string,
  targetName: string
): Promise<DbRebrandResult> {
  const matrix = buildCasingMatrix(sourceName, targetName);
  const updatedSchemaFiles: string[] = [];

  const normalizedRoot = rootDir.replace(/\\/g, '/');

  // Discover Prisma, Drizzle, TypeORM, and SQL schema files
  const schemaCandidates = await fg([
    '**/schema.prisma',
    '**/drizzle.config.*',
    '**/ormconfig.*',
    '**/migrations/**/*.sql',
    '**/seeds/**/*.sql'
  ], {
    cwd: normalizedRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**']
  });

  for (const filePath of schemaCandidates) {
    try {
      const content = await readTextFile(filePath);
      let updated = content;

      for (const pair of matrix.pairs) {
        if (updated.includes(pair.source)) {
          updated = updated.split(pair.source).join(pair.target);
        }
      }

      if (updated !== content) {
        await writeTextFile(filePath, updated);
        updatedSchemaFiles.push(path.relative(rootDir, filePath));
      }
    } catch {}
  }

  return { updatedSchemaFiles };
}
