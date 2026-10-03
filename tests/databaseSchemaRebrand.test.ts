import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { rebrandDatabaseSchemas } from '../src/core/rebrand/databaseSchemaRebrander.js';

const DB_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'db-rebrand-test');

describe('Database Schema & Migration Rebrander', () => {
  beforeEach(async () => {
    await fs.ensureDir(DB_DIR);
    await fs.ensureDir(path.join(DB_DIR, 'prisma'));
    await fs.ensureDir(path.join(DB_DIR, 'migrations'));

    await fs.writeFile(
      path.join(DB_DIR, 'prisma', 'schema.prisma'),
      `datasource db {\n  provider = "postgresql"\n  url = "postgresql://postgres:pass@localhost:5432/brainflow_dev"\n}\n\nmodel BrainFlowSession {\n  id String @id\n}\n`
    );

    await fs.writeFile(
      path.join(DB_DIR, 'migrations', 'init.sql'),
      `CREATE TABLE brainflow_messages (id SERIAL PRIMARY KEY);\n`
    );
  });

  afterEach(async () => {
    await fs.remove(DB_DIR);
  });

  it('should rebrand Prisma schema and SQL migrations', async () => {
    const res = await rebrandDatabaseSchemas(DB_DIR, 'BrainFlow', 'OmniDesk');
    expect(res.updatedSchemaFiles.length).toBe(2);

    const prisma = await fs.readFile(path.join(DB_DIR, 'prisma', 'schema.prisma'), 'utf-8');
    expect(prisma).toContain('omnidesk_dev');
    expect(prisma).toContain('OmniDeskSession');

    const sql = await fs.readFile(path.join(DB_DIR, 'migrations', 'init.sql'), 'utf-8');
    expect(sql).toContain('omnidesk_messages');
  });
});
