/**
 * DocumentParserAgent — AI agent for NLP-based document parsing.
 *
 * Implements Story 6.5: structured extraction of vendor invoices and receipts.
 *
 * Extraction schema: vendor_name, date, amount, tax_id, items[]
 *
 * Strategy:
 *   1. If LLM_API_KEY is configured → use LLM for structured extraction
 *   2. Fallback → regex-based extraction for common Thai receipt formats
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.5
 */

import { ValidationError } from '@neip/shared';

import type {
  AgentContext,
  AgentResult,
  LlmClient,
} from '../types/agent-types.js';
import { BaseAgent, AgentTrace, UnconfiguredLlmClient } from './base-agent.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ExtractedItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: string; // satang string
  readonly totalPrice: string; // satang string
  readonly confidence: number;
}

export interface ExtractedField<T> {
  readonly value: T;
  readonly confidence: number;
}

export interface DocumentParseInput {
  readonly content: string; // raw text content of the document
  readonly filename?: string;
  readonly mimeType?: string;
}

export interface DocumentParseOutput {
  readonly vendorName: ExtractedField<string>;
  readonly date: ExtractedField<string>;
  readonly amount: ExtractedField<string>; // satang string
  readonly taxId: ExtractedField<string>;
  readonly items: ReadonlyArray<ExtractedItem>;
  readonly rawText: string;
  readonly extractionMethod: 'llm' | 'regex';
}

// ---------------------------------------------------------------------------
// Thai receipt regex patterns
// ---------------------------------------------------------------------------

const PATTERNS = {
  taxId: /(?:เลขประจำตัวผู้เสียภาษี|Tax\s*ID|เลขที่ผู้เสียภาษี)[:\s]*(\d{13})/i,
  date: /(?:วันที่|Date)[:\s]*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
  amount: /(?:รวมทั้งสิ้น|Grand\s*Total|ยอดรวม|Total|จำนวนเงินรวม)[:\s]*(?:฿|THB)?\s*([\d,]+(?:\.\d{2})?)/i,
  vendorName: /(?:บริษัท|ห้างหุ้นส่วน|Company|ร้าน)\s*([^\n\r]+?)(?:\s*จำกัด|\s*Ltd\.?|\s*Co\.?,?\s*Ltd\.?|$)/im,
  invoiceNumber: /(?:เลขที่|Invoice\s*(?:No\.?|Number)|เลขที่ใบกำกับ)[:\s]*([A-Z0-9-]+)/i,
};

// ---------------------------------------------------------------------------
// DocumentParserAgent
// ---------------------------------------------------------------------------

export class DocumentParserAgent extends BaseAgent<
  DocumentParseInput,
  DocumentParseOutput
> {
  private readonly llmClient: LlmClient;

  constructor(config?: {
    agentId?: string;
    timeoutMs?: number;
    llmClient?: LlmClient;
  }) {
    super({
      agentId: config?.agentId ?? 'document-parser-agent',
      timeoutMs: config?.timeoutMs ?? 30_000,
    });
    this.llmClient = config?.llmClient ?? new UnconfiguredLlmClient();
  }

  protected async executeCore(
    input: DocumentParseInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<DocumentParseOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Document parsing: validating input', {
      contentLength: input.content.length,
      filename: input.filename ?? 'unknown',
      tenantId: context.tenantId,
    });

    if (!input.content || input.content.trim().length === 0) {
      return this.buildFailure(
        new ValidationError({
          detail: 'Document content is empty. Cannot extract fields.',
        }),
        trace,
        startMs,
      );
    }

    // Try LLM extraction first if configured
    if (this.llmClient.isConfigured) {
      trace.addStep('reasoning', 'LLM client available — attempting structured extraction');
      try {
        const result = await this.extractWithLlm(input, trace);
        return this.buildSuccess(result, 0.85, trace, startMs);
      } catch {
        trace.addStep('reasoning', 'LLM extraction failed — falling back to regex');
      }
    } else {
      trace.addStep('reasoning', 'No LLM configured — using regex extraction');
    }

    // Fallback: regex-based extraction
    const result = this.extractWithRegex(input.content, trace);

    // Confidence based on how many fields were extracted
    const fieldsFound = [
      result.vendorName.confidence,
      result.date.confidence,
      result.amount.confidence,
      result.taxId.confidence,
    ].filter((c) => c > 0).length;
    const confidence = Math.max(0.2, fieldsFound * 0.2);

    trace.addStep('final-answer', 'Document parsing complete', {
      method: 'regex',
      fieldsExtracted: fieldsFound,
    });

    return this.buildSuccess(result, confidence, trace, startMs);
  }

  // ---------------------------------------------------------------------------
  // LLM extraction
  // ---------------------------------------------------------------------------

  private async extractWithLlm(
    input: DocumentParseInput,
    trace: AgentTrace,
  ): Promise<DocumentParseOutput> {
    trace.incrementIteration();

    const response = await this.llmClient.complete([
      {
        role: 'system',
        content: `You are a document parsing assistant. Extract structured data from the following document text.
Return ONLY a JSON object with these fields:
- vendor_name: string
- date: string (YYYY-MM-DD format)
- amount: number (total amount in THB)
- tax_id: string (13-digit Thai tax ID)
- items: array of {description, quantity, unit_price, total_price}
If a field cannot be found, use empty string or 0.`,
      },
      {
        role: 'user',
        content: input.content.slice(0, 4000),
      },
    ], { maxTokens: 1024, temperature: 0 });

    trace.addStep('tool-result', 'LLM extraction response received');

    // Parse LLM response
    const text = response.content ?? '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as Record<string, unknown>;

    const amountTHB = Number(parsed['amount'] ?? 0);
    const amountSatang = Math.round(amountTHB * 100);

    const items = Array.isArray(parsed['items'])
      ? (parsed['items'] as Array<Record<string, unknown>>).map((item) => ({
          description: String(item['description'] ?? ''),
          quantity: Number(item['quantity'] ?? 1),
          unitPrice: String(Math.round(Number(item['unit_price'] ?? 0) * 100)),
          totalPrice: String(Math.round(Number(item['total_price'] ?? 0) * 100)),
          confidence: 0.8,
        }))
      : [];

    return {
      vendorName: { value: String(parsed['vendor_name'] ?? ''), confidence: parsed['vendor_name'] ? 0.85 : 0 },
      date: { value: String(parsed['date'] ?? ''), confidence: parsed['date'] ? 0.85 : 0 },
      amount: { value: String(amountSatang), confidence: amountTHB > 0 ? 0.85 : 0 },
      taxId: { value: String(parsed['tax_id'] ?? ''), confidence: parsed['tax_id'] ? 0.85 : 0 },
      items,
      rawText: input.content,
      extractionMethod: 'llm',
    };
  }

  // ---------------------------------------------------------------------------
  // Regex extraction
  // ---------------------------------------------------------------------------

  private extractWithRegex(content: string, trace: AgentTrace): DocumentParseOutput {
    const vendorMatch = content.match(PATTERNS.vendorName);
    const dateMatch = content.match(PATTERNS.date);
    const amountMatch = content.match(PATTERNS.amount);
    const taxIdMatch = content.match(PATTERNS.taxId);

    // Parse amount to satang
    let amountSatang = '0';
    if (amountMatch?.[1]) {
      const cleaned = amountMatch[1].replace(/,/g, '');
      const thb = parseFloat(cleaned);
      if (!isNaN(thb)) {
        amountSatang = String(Math.round(thb * 100));
      }
    }

    // Parse date to ISO format
    let dateValue = '';
    if (dateMatch?.[1]) {
      const parts = dateMatch[1].split(/[/\-.]/);
      if (parts.length === 3) {
        let [day, month, year] = parts as [string, string, string];
        // Handle BE year (Thai Buddhist Era)
        const yearNum = parseInt(year, 10);
        if (yearNum > 2500) {
          year = String(yearNum - 543);
        } else if (yearNum < 100) {
          year = String(2000 + yearNum);
        }
        dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    trace.addStep('reasoning', 'Regex extraction results', {
      vendorFound: !!vendorMatch,
      dateFound: !!dateMatch,
      amountFound: !!amountMatch,
      taxIdFound: !!taxIdMatch,
    });

    return {
      vendorName: {
        value: vendorMatch?.[1]?.trim() ?? '',
        confidence: vendorMatch ? 0.7 : 0,
      },
      date: {
        value: dateValue,
        confidence: dateMatch ? 0.6 : 0,
      },
      amount: {
        value: amountSatang,
        confidence: amountMatch ? 0.7 : 0,
      },
      taxId: {
        value: taxIdMatch?.[1] ?? '',
        confidence: taxIdMatch ? 0.9 : 0,
      },
      items: [],
      rawText: content,
      extractionMethod: 'regex',
    };
  }
}
