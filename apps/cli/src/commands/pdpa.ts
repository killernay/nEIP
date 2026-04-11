/**
 * neip pdpa — PDPA (Personal Data Protection Act) compliance commands.
 *
 * Commands:
 *   neip pdpa access-request       — POST /api/v1/pdpa/access-request (interactive)
 *   neip pdpa erasure-request      — POST /api/v1/pdpa/erasure-request (interactive)
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

export function buildPdpaCommand(): Command {
  const cmd = new Command('pdpa')
    .description('จัดการ PDPA — Personal Data Protection Act compliance')
    .addHelpText('after', `
Examples:
  $ neip pdpa access-request                   # ส่งคำขอเข้าถึงข้อมูล
  $ neip pdpa erasure-request                  # ส่งคำขอลบข้อมูล
  `);

  cmd.command('access-request')
    .description('ส่งคำขอเข้าถึงข้อมูลส่วนบุคคล — Submit a data access request (DSAR)')
    .action(async () => {
      process.stdout.write('Submit a PDPA data access request.\n');
      const subjectName = await prompt('Data subject name: ');
      const subjectEmail = await prompt('Data subject email: ');
      const requestType = await prompt('Request type (access/portability) [access]: ');

      const result = await api.post<{ data: unknown }>('/api/v1/pdpa/access-request', {
        subjectName,
        subjectEmail,
        requestType: requestType || 'access',
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'PDPA access request submitted.');
    });

  cmd.command('erasure-request')
    .description('ส่งคำขอลบข้อมูลส่วนบุคคล — Submit a data erasure request')
    .action(async () => {
      process.stdout.write('Submit a PDPA data erasure request.\n');
      const subjectName = await prompt('Data subject name: ');
      const subjectEmail = await prompt('Data subject email: ');
      const reason = await prompt('Reason for erasure: ');

      const result = await api.post<{ data: unknown }>('/api/v1/pdpa/erasure-request', {
        subjectName,
        subjectEmail,
        reason,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'PDPA erasure request submitted.');
    });

  return cmd;
}
