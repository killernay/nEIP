/**
 * neip dms — Document Management System commands (DMS).
 *
 * Commands:
 *   neip dms list              — GET  /api/v1/documents
 *   neip dms upload            — POST /api/v1/documents
 *   neip dms delete <id>       — DELETE /api/v1/documents/:id
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildDmsCommand(): Command {
  const cmd = new Command('dms')
    .description('จัดการเอกสาร — Document Management System (DMS)')
    .addHelpText('after', `
Examples:
  $ neip dms list                                  # ดูเอกสาร
  $ neip dms list --entity-type invoice --entity-id <id>
  $ neip dms upload --file invoice.pdf --entity-type invoice --entity-id <id>
  $ neip dms delete <id>                           # ลบเอกสาร
  `);

  cmd.command('list')
    .description('ดูเอกสาร — List documents')
    .option('--entity-type <type>', 'Filter by entity type (invoice, contract, etc.)')
    .option('--entity-id <id>', 'Filter by entity ID')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { entityType?: string; entityId?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.entityType) params['entityType'] = opts.entityType;
      if (opts.entityId) params['entityId'] = opts.entityId;
      const result = await api.get<{ data: unknown[] }>('/api/v1/documents', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Documents');
    });

  cmd.command('upload')
    .description('อัปโหลดเอกสาร — Upload a document')
    .requiredOption('--file <path>', 'File path to upload')
    .requiredOption('--entity-type <type>', 'Entity type (invoice, contract, etc.)')
    .requiredOption('--entity-id <id>', 'Entity ID')
    .option('--description <desc>', 'Document description')
    .action(async (opts: { file: string; entityType: string; entityId: string; description?: string }) => {
      const body: Record<string, unknown> = {
        filePath: opts.file, entityType: opts.entityType, entityId: opts.entityId,
      };
      if (opts.description) body['description'] = opts.description;
      const result = await api.post<{ data: unknown }>('/api/v1/documents', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Document uploaded');
    });

  cmd.command('delete')
    .description('ลบเอกสาร — Delete a document')
    .argument('<id>', 'Document ID')
    .action(async (id: string) => {
      const result = await api.delete<{ data: unknown }>(`/api/v1/documents/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Document deleted');
    });

  return cmd;
}
