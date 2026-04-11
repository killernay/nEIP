/**
 * neip credit — Credit exposure check commands.
 *
 * Commands:
 *   neip credit check <contactId>  — GET /api/v1/credit/check/:contactId
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildCreditCommand(): Command {
  const cmd = new Command('credit')
    .description('ตรวจสอบวงเงินเครดิต — Credit exposure management')
    .addHelpText('after', `
Examples:
  $ neip credit check <contactId>              # ตรวจสอบวงเงินเครดิตลูกค้า
  `);

  cmd.command('check <contactId>')
    .description('ตรวจสอบวงเงินเครดิตลูกค้า — Check credit exposure for a contact')
    .action(async (contactId: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/credit/check/${contactId}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Credit exposure for ${contactId}:`);
    });

  return cmd;
}
