/**
 * Journal Entry — domain logic and tool definitions.
 *
 * Architecture reference: Story 2.4.
 *
 * Tools:
 *   gl.createJournalEntry  — create a draft journal entry
 *   gl.postJournalEntry    — post a draft entry (makes it immutable)
 *   gl.reverseJournalEntry — reverse a posted entry
 *
 * Business rules:
 *   - Double-entry: sum of debits MUST equal sum of credits
 *   - Minimum 2 line items
 *   - Status flow: draft → posted → reversed
 *   - Posted entries are immutable — only reversible
 *   - All amounts use Money VO (bigint satang)
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ok,
  err,
} from '@neip/shared';
import type { ToolResult } from '@neip/shared';
import type { DbClient } from '@neip/db';
import { journal_entries, journal_entry_lines, fiscal_periods, fiscal_years } from '@neip/db';
import type { ToolDefinition, ExecutionContext } from '../tool-registry/types.js';
import { EventStore } from '../events/event-store.js';
import { DocumentNumberingService } from './document-numbering.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const lineItemSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().optional(),
  /** Debit amount in satang (string representation of bigint). */
  debitSatang: z.string().default('0'),
  /** Credit amount in satang (string representation of bigint). */
  creditSatang: z.string().default('0'),
});

const createJournalEntrySchema = z.object({
  description: z.string().min(1),
  fiscalYear: z.number().int(),
  fiscalPeriod: z.number().int().min(1).max(12),
  lines: z.array(lineItemSchema).min(2),
});

const postJournalEntrySchema = z.object({
  entryId: z.string().min(1),
});

const reverseJournalEntrySchema = z.object({
  entryId: z.string().min(1),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface JournalEntryLineOutput {
  id: string;
  lineNumber: number;
  accountId: string;
  description: string | null;
  debitSatang: string;
  creditSatang: string;
}

export interface JournalEntryOutput {
  id: string;
  documentNumber: string;
  description: string;
  status: string;
  fiscalYear: number;
  fiscalPeriod: number;
  reversedEntryId: string | null;
  tenantId: string;
  createdBy: string;
  postedAt: Date | null;
  createdAt: Date;
  lines: JournalEntryLineOutput[];
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createJournalEntryTools(
  db: DbClient,
  eventStore: EventStore,
  docNumbering: DocumentNumberingService,
) {
  // -------------------------------------------------------------------------
  // gl.createJournalEntry
  // -------------------------------------------------------------------------
  const createJournalEntry: ToolDefinition<
    z.infer<typeof createJournalEntrySchema>,
    JournalEntryOutput
  > = {
    name: 'gl.createJournalEntry',
    description: 'Create a new draft journal entry with double-entry validation.',
    inputSchema: createJournalEntrySchema,
    handler: async (
      params: z.infer<typeof createJournalEntrySchema>,
      ctx: ExecutionContext,
    ): Promise<ToolResult<JournalEntryOutput>> => {
      // Validate double-entry: debits must equal credits
      let totalDebit = 0n;
      let totalCredit = 0n;

      for (const line of params.lines) {
        totalDebit += BigInt(line.debitSatang);
        totalCredit += BigInt(line.creditSatang);
      }

      if (totalDebit !== totalCredit) {
        return err(
          new ValidationError({
            detail: `Double-entry violation: total debits (${totalDebit}) must equal total credits (${totalCredit}).`,
          }),
        );
      }

      if (totalDebit === 0n) {
        return err(
          new ValidationError({
            detail: 'Journal entry must have non-zero amounts.',
          }),
        );
      }

      // Generate document number
      const documentNumber = await docNumbering.next(
        ctx.tenantId,
        'journal_entry',
        params.fiscalYear,
      );

      const entryId = uuidv7();
      const now = new Date();

      // Insert header
      await db.insert(journal_entries).values({
        id: entryId,
        document_number: documentNumber,
        description: params.description,
        status: 'draft',
        fiscal_year: params.fiscalYear,
        fiscal_period: params.fiscalPeriod,
        tenant_id: ctx.tenantId,
        created_by: ctx.userId,
        created_at: now,
        updated_at: now,
      });

      // Insert lines
      const lineOutputs: JournalEntryLineOutput[] = [];
      for (let i = 0; i < params.lines.length; i++) {
        const line = params.lines[i]!;
        const lineId = uuidv7();

        await db.insert(journal_entry_lines).values({
          id: lineId,
          entry_id: entryId,
          line_number: i + 1,
          account_id: line.accountId,
          description: line.description ?? null,
          debit_satang: BigInt(line.debitSatang),
          credit_satang: BigInt(line.creditSatang),
          created_at: now,
        });

        lineOutputs.push({
          id: lineId,
          lineNumber: i + 1,
          accountId: line.accountId,
          description: line.description ?? null,
          debitSatang: line.debitSatang,
          creditSatang: line.creditSatang,
        });
      }

      // Emit domain event
      await eventStore.append({
        type: 'JournalEntryCreated',
        aggregateId: entryId,
        aggregateType: 'JournalEntry',
        tenantId: ctx.tenantId,
        payload: {
          documentNumber,
          description: params.description,
          lineCount: params.lines.length,
          totalDebitSatang: totalDebit.toString(),
          totalCreditSatang: totalCredit.toString(),
        },
        version: 1,
        fiscalYear: params.fiscalYear,
      });

      return ok({
        id: entryId,
        documentNumber,
        description: params.description,
        status: 'draft',
        fiscalYear: params.fiscalYear,
        fiscalPeriod: params.fiscalPeriod,
        reversedEntryId: null,
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        postedAt: null,
        createdAt: now,
        lines: lineOutputs,
      });
    },
  };

  // -------------------------------------------------------------------------
  // gl.postJournalEntry
  // -------------------------------------------------------------------------
  const postJournalEntry: ToolDefinition<
    z.infer<typeof postJournalEntrySchema>,
    JournalEntryOutput
  > = {
    name: 'gl.postJournalEntry',
    description: 'Post a draft journal entry, making it immutable.',
    inputSchema: postJournalEntrySchema,
    handler: async (
      params: z.infer<typeof postJournalEntrySchema>,
      ctx: ExecutionContext,
    ): Promise<ToolResult<JournalEntryOutput>> => {
      // Fetch entry
      const entryRows = await db
        .select()
        .from(journal_entries)
        .where(
          and(
            eq(journal_entries.id, params.entryId),
            eq(journal_entries.tenant_id, ctx.tenantId),
          ),
        );

      const entry = entryRows[0];
      if (entry === undefined) {
        return err(
          new NotFoundError({ detail: `Journal entry "${params.entryId}" not found.` }),
        );
      }

      if (entry.status !== 'draft') {
        return err(
          new ConflictError({
            detail: `Journal entry "${params.entryId}" cannot be posted — current status is "${entry.status}".`,
          }),
        );
      }

      // H-1 FIX: Check if period is open — filter by tenant AND fiscal year
      const periodRows = await db
        .select({ status: fiscal_periods.status })
        .from(fiscal_periods)
        .innerJoin(fiscal_years, eq(fiscal_periods.fiscal_year_id, fiscal_years.id))
        .where(
          and(
            eq(fiscal_years.tenant_id, ctx.tenantId),
            eq(fiscal_years.year, entry.fiscal_year),
            eq(fiscal_periods.period_number, entry.fiscal_period),
          ),
        )
        .limit(1);

      if (periodRows[0]?.status === 'closed') {
        return err(
          new ConflictError({
            detail: `Cannot post to closed fiscal period ${entry.fiscal_period}/${entry.fiscal_year}.`,
          }),
        );
      }

      const postedAt = new Date();

      await db
        .update(journal_entries)
        .set({
          status: 'posted',
          posted_at: postedAt,
          updated_at: new Date(),
        })
        .where(eq(journal_entries.id, params.entryId));

      // Get lines
      const lineRows = await db
        .select()
        .from(journal_entry_lines)
        .where(eq(journal_entry_lines.entry_id, params.entryId));

      const lines: JournalEntryLineOutput[] = lineRows.map((l) => ({
        id: l.id,
        lineNumber: l.line_number,
        accountId: l.account_id,
        description: l.description,
        debitSatang: l.debit_satang.toString(),
        creditSatang: l.credit_satang.toString(),
      }));

      // Emit domain event
      await eventStore.append({
        type: 'JournalEntryPosted',
        aggregateId: params.entryId,
        aggregateType: 'JournalEntry',
        tenantId: ctx.tenantId,
        payload: {
          documentNumber: entry.document_number,
          postedAt: postedAt.toISOString(),
        },
        version: 2,
        fiscalYear: entry.fiscal_year,
      });

      return ok({
        id: entry.id,
        documentNumber: entry.document_number,
        description: entry.description,
        status: 'posted',
        fiscalYear: entry.fiscal_year,
        fiscalPeriod: entry.fiscal_period,
        reversedEntryId: entry.reversed_entry_id,
        tenantId: entry.tenant_id,
        createdBy: entry.created_by,
        postedAt,
        createdAt: entry.created_at,
        lines,
      });
    },
  };

  // -------------------------------------------------------------------------
  // gl.reverseJournalEntry
  // -------------------------------------------------------------------------
  const reverseJournalEntry: ToolDefinition<
    z.infer<typeof reverseJournalEntrySchema>,
    JournalEntryOutput
  > = {
    name: 'gl.reverseJournalEntry',
    description: 'Reverse a posted journal entry by creating a mirror entry.',
    inputSchema: reverseJournalEntrySchema,
    handler: async (
      params: z.infer<typeof reverseJournalEntrySchema>,
      ctx: ExecutionContext,
    ): Promise<ToolResult<JournalEntryOutput>> => {
      // Fetch original entry
      const entryRows = await db
        .select()
        .from(journal_entries)
        .where(
          and(
            eq(journal_entries.id, params.entryId),
            eq(journal_entries.tenant_id, ctx.tenantId),
          ),
        );

      const original = entryRows[0];
      if (original === undefined) {
        return err(
          new NotFoundError({ detail: `Journal entry "${params.entryId}" not found.` }),
        );
      }

      if (original.status !== 'posted') {
        return err(
          new ConflictError({
            detail: `Journal entry "${params.entryId}" cannot be reversed — current status is "${original.status}".`,
          }),
        );
      }

      // Mark original as reversed
      await db
        .update(journal_entries)
        .set({ status: 'reversed', updated_at: new Date() })
        .where(eq(journal_entries.id, params.entryId));

      // Create reversal entry with swapped debits/credits
      const reversalId = uuidv7();
      const now = new Date();
      const reversalDescription =
        params.description ?? `Reversal of ${original.document_number}`;

      const reversalDocNumber = await docNumbering.next(
        ctx.tenantId,
        'journal_entry',
        original.fiscal_year,
      );

      await db.insert(journal_entries).values({
        id: reversalId,
        document_number: reversalDocNumber,
        description: reversalDescription,
        status: 'posted',
        fiscal_year: original.fiscal_year,
        fiscal_period: original.fiscal_period,
        reversed_entry_id: params.entryId,
        tenant_id: ctx.tenantId,
        created_by: ctx.userId,
        posted_at: now,
        created_at: now,
        updated_at: now,
      });

      // Get original lines and create reversed lines
      const originalLines = await db
        .select()
        .from(journal_entry_lines)
        .where(eq(journal_entry_lines.entry_id, params.entryId));

      const reversedLineOutputs: JournalEntryLineOutput[] = [];
      for (const origLine of originalLines) {
        const lineId = uuidv7();
        // Swap debit/credit
        await db.insert(journal_entry_lines).values({
          id: lineId,
          entry_id: reversalId,
          line_number: origLine.line_number,
          account_id: origLine.account_id,
          description: origLine.description,
          debit_satang: origLine.credit_satang,
          credit_satang: origLine.debit_satang,
          created_at: now,
        });

        reversedLineOutputs.push({
          id: lineId,
          lineNumber: origLine.line_number,
          accountId: origLine.account_id,
          description: origLine.description,
          debitSatang: origLine.credit_satang.toString(),
          creditSatang: origLine.debit_satang.toString(),
        });
      }

      // Emit domain event for reversal
      await eventStore.append({
        type: 'JournalEntryReversed',
        aggregateId: reversalId,
        aggregateType: 'JournalEntry',
        tenantId: ctx.tenantId,
        payload: {
          originalEntryId: params.entryId,
          originalDocumentNumber: original.document_number,
          reversalDocumentNumber: reversalDocNumber,
        },
        version: 1,
        fiscalYear: original.fiscal_year,
      });

      return ok({
        id: reversalId,
        documentNumber: reversalDocNumber,
        description: reversalDescription,
        status: 'posted',
        fiscalYear: original.fiscal_year,
        fiscalPeriod: original.fiscal_period,
        reversedEntryId: params.entryId,
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        postedAt: now,
        createdAt: now,
        lines: reversedLineOutputs,
      });
    },
  };

  return { createJournalEntry, postJournalEntry, reverseJournalEntry };
}
