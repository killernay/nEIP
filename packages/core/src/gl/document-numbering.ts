/**
 * Document Numbering Service — sequential, gap-free document numbers.
 *
 * Architecture reference: Story 2.6.
 *
 * Format: {PREFIX}-{YEAR}-{PADDED_NUMBER}
 * Example: JV-2026-0001
 *
 * Concurrency safety: PostgreSQL advisory lock per (tenant, docType, fiscalYear).
 * The advisory lock key is computed as a hash of the composite key to fit into
 * PostgreSQL's bigint lock key space.
 */

import { eq, and, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { DbClient } from '@neip/db';
import { document_sequences } from '@neip/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported document types. */
export type DocType =
  | 'journal_entry'
  | 'invoice'
  | 'payment'
  | 'bill'
  | 'receipt'
  | 'quotation'
  | 'credit_note'
  | 'delivery_note'
  | 'sales_order'
  | 'purchase_order'
  | 'wht'
  | 'bill_payment';

/** Default prefix mapping per document type. */
const DOC_TYPE_PREFIXES: Record<DocType, string> = {
  journal_entry: 'JV',
  invoice: 'INV',
  payment: 'PMT',
  bill: 'BILL',
  receipt: 'RCT',
  quotation: 'QT',
  credit_note: 'CN',
  delivery_note: 'DO',
  sales_order: 'SO',
  purchase_order: 'PO',
  wht: 'WHT',
  bill_payment: 'BP',
};

// ---------------------------------------------------------------------------
// DocumentNumberingService
// ---------------------------------------------------------------------------

/**
 * Generates sequential, gap-free document numbers per document type
 * per fiscal year per tenant.
 *
 * Each call to `next()` acquires a PostgreSQL advisory lock scoped to the
 * current transaction, increments the sequence, and returns the formatted
 * document number. The lock is automatically released when the transaction
 * commits or rolls back.
 *
 * IMPORTANT: `next()` must be called within a transaction context for the
 * advisory lock to provide gap-free guarantees.
 */
export class DocumentNumberingService {
  readonly #db: DbClient;

  constructor(db: DbClient) {
    this.#db = db;
  }

  /**
   * Get the next document number for the given doc type and fiscal year.
   *
   * @param tenantId  - Tenant identifier.
   * @param docType   - Document type (e.g., 'journal_entry').
   * @param fiscalYear - Fiscal year (e.g., 2026).
   * @returns Formatted document number (e.g., 'JV-2026-0001').
   */
  async next(tenantId: string, docType: DocType, fiscalYear: number): Promise<string> {
    const prefix = DOC_TYPE_PREFIXES[docType];

    // Acquire advisory lock scoped to this transaction
    const lockKey = computeAdvisoryLockKey(tenantId, docType, fiscalYear);
    await this.#db.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

    // Find or create sequence row
    const existing = await this.#db
      .select()
      .from(document_sequences)
      .where(
        and(
          eq(document_sequences.tenant_id, tenantId),
          eq(document_sequences.doc_type, docType),
          eq(document_sequences.fiscal_year, fiscalYear),
        ),
      );

    let nextNumber: number;

    if (existing.length === 0) {
      // Create new sequence
      nextNumber = 1;
      await this.#db.insert(document_sequences).values({
        id: uuidv7(),
        doc_type: docType,
        fiscal_year: fiscalYear,
        prefix,
        last_number: 1,
        tenant_id: tenantId,
      });
    } else {
      // Increment existing sequence
      const row = existing[0]!;
      nextNumber = row.last_number + 1;
      await this.#db
        .update(document_sequences)
        .set({ last_number: nextNumber, updated_at: new Date() })
        .where(eq(document_sequences.id, row.id));
    }

    return formatDocumentNumber(prefix, fiscalYear, nextNumber);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate the next document number using a raw postgres.js SQL client.
 * This is suitable for route handlers that use `fastify.sql` instead of Drizzle.
 *
 * Uses advisory locks to ensure gap-free numbering within a connection.
 */
export async function nextDocNumber(
  sql: { unsafe: (q: string, params?: any[]) => Promise<any[]> },
  tenantId: string,
  docType: DocType,
  fiscalYear: number,
): Promise<string> {
  const prefix = DOC_TYPE_PREFIXES[docType];
  const lockKey = computeAdvisoryLockKey(tenantId, docType, fiscalYear);

  // Advisory lock (session-level — released at end of transaction or manually)
  await sql.unsafe(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

  // Find or create sequence row
  const existing = await sql.unsafe(
    `SELECT id, last_number FROM document_sequences
     WHERE tenant_id = $1 AND doc_type = $2 AND fiscal_year = $3`,
    [tenantId, docType, fiscalYear],
  ) as Array<{ id: string; last_number: number }>;

  let nextNumber: number;

  if (existing.length === 0) {
    nextNumber = 1;
    const id = crypto.randomUUID();
    await sql.unsafe(
      `INSERT INTO document_sequences (id, doc_type, fiscal_year, prefix, last_number, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, docType, fiscalYear, prefix, 1, tenantId],
    );
  } else {
    const row = existing[0]!;
    nextNumber = row.last_number + 1;
    await sql.unsafe(
      `UPDATE document_sequences SET last_number = $1, updated_at = NOW() WHERE id = $2`,
      [nextNumber, row.id],
    );
  }

  return formatDocumentNumber(prefix, fiscalYear, nextNumber);
}

/**
 * Format a document number: {PREFIX}-{YEAR}-{PADDED_NUMBER}
 * Number is zero-padded to 4 digits.
 */
export function formatDocumentNumber(
  prefix: string,
  fiscalYear: number,
  number: number,
): string {
  return `${prefix}-${fiscalYear}-${number.toString().padStart(4, '0')}`;
}

/**
 * Compute a stable bigint advisory lock key from the composite key.
 * Uses a simple hash to map (tenantId, docType, fiscalYear) → bigint.
 */
function computeAdvisoryLockKey(
  tenantId: string,
  docType: string,
  fiscalYear: number,
): number {
  const str = `${tenantId}:${docType}:${fiscalYear}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
  }
  return hash;
}
