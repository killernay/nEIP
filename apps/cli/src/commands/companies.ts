/**
 * neip company — Multi-company management commands.
 *
 * Commands:
 *   neip company list            — GET  /api/v1/companies
 *   neip company create          — POST /api/v1/companies (interactive)
 *   neip company switch <id>     — POST /api/v1/companies/:id/switch
 */

import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

export function buildCompanyCommand(): Command {
  const cmd = new Command('company')
    .description('จัดการบริษัท (Multi-company) — Multi-company management')
    .addHelpText('after', `
Examples:
  $ neip company list                          # แสดงบริษัททั้งหมด
  $ neip company create                        # สร้างบริษัท (interactive)
  $ neip company switch <id>                   # เปลี่ยนบริษัทที่ทำงาน
  `);

  cmd.command('list')
    .description('แสดงบริษัททั้งหมด — List companies')
    .action(async () => {
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/companies');
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} companies`);
    });

  cmd.command('create')
    .description('สร้างบริษัท (interactive) — Create a company')
    .action(async () => {
      process.stdout.write('Create a new company.\n');
      const name = await prompt('Company name: ');
      const taxId = await prompt('Tax ID (13 digits): ');
      const currency = await prompt('Base currency [THB]: ');

      const result = await api.post<{ data: unknown }>('/api/v1/companies', {
        name,
        taxId,
        baseCurrency: currency || 'THB',
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Company "${name}" created.`);
    });

  cmd.command('switch <id>')
    .description('เปลี่ยนบริษัทที่ทำงาน — Switch active company context')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/companies/${id}/switch`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Switched to company ${id}.`);
    });

  return cmd;
}
