'use client';

import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface DocPageProps {
  /** Page title (Thai) */
  title: string;
  /** Page title (English) */
  titleEn?: string;
  /** Short description shown below the title */
  description?: string;
  /** Structured sections rendered with headings + anchors */
  sections: DocSection[];
  /** Additional className */
  className?: string;
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

function DocSectionBlock({ section }: { section: DocSection }): React.JSX.Element {
  return (
    <section id={section.id} className="scroll-mt-20">
      <h2 className="mb-4 text-xl font-semibold text-foreground">
        <a
          href={`#${section.id}`}
          className="hover:text-primary transition-colors"
        >
          {section.title}
        </a>
      </h2>
      <div className="prose-custom">{section.content}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DocPage component
// ---------------------------------------------------------------------------

export function DocPage({
  title,
  titleEn,
  description,
  sections,
  className,
}: DocPageProps): React.JSX.Element {
  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6 lg:px-8', className)}>
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          {title}
        </h1>
        {titleEn && (
          <p className="mt-1 text-sm text-muted-foreground">{titleEn}</p>
        )}
        {description && (
          <p className="mt-2 text-base text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Table of Contents */}
      {sections.length > 2 && (
        <nav
          aria-label="Table of contents"
          className="mb-8 rounded-lg border border-border bg-card p-4"
        >
          <p className="mb-2 text-sm font-semibold text-foreground">
            Table of Contents
          </p>
          <ul className="flex flex-col gap-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <DocSectionBlock key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable prose elements for doc content
// ---------------------------------------------------------------------------

export function DocParagraph({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <p className={cn('mb-3 leading-7 text-foreground/90', className)}>
      {children}
    </p>
  );
}

export function DocList({
  items,
  ordered,
}: {
  items: React.ReactNode[];
  ordered?: boolean;
}): React.JSX.Element {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={cn(
        'mb-4 flex flex-col gap-1.5 pl-6 text-foreground/90',
        ordered ? 'list-decimal' : 'list-disc',
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="leading-7">
          {item}
        </li>
      ))}
    </Tag>
  );
}

export function DocCode({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
      {children}
    </code>
  );
}

export function DocCodeBlock({
  children,
  title,
}: {
  children: string;
  title?: string;
}): React.JSX.Element {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      {title && (
        <div className="border-b border-border bg-muted px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </div>
      )}
      <pre className="overflow-x-auto bg-card p-4">
        <code className="text-sm font-mono text-foreground">{children}</code>
      </pre>
    </div>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}): React.JSX.Element {
  return (
    <div className="mb-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-foreground/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocCallout({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warning' | 'tip';
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = {
    info: 'border-primary/30 bg-primary/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    tip: 'border-green-500/30 bg-green-500/5',
  };
  const labels = { info: 'Info', warning: 'Warning', tip: 'Tip' };

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border-l-4 p-4',
        styles[type],
      )}
    >
      {title && (
        <p className="mb-1 text-sm font-semibold text-foreground">
          {title}
        </p>
      )}
      {!title && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {labels[type]}
        </p>
      )}
      <div className="text-sm leading-6 text-foreground/90">{children}</div>
    </div>
  );
}
