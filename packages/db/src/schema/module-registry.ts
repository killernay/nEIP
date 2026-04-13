import { pgTable, text, boolean, integer } from 'drizzle-orm/pg-core';

export const module_registry = pgTable('module_registry', {
  code: text('code').primaryKey(),
  name_th: text('name_th').notNull(),
  name_en: text('name_en').notNull(),
  description: text('description'),
  tier: text('tier').notNull(),
  dependencies: text('dependencies').array().default([]),
  is_default: boolean('is_default').default(false),
  sort_order: integer('sort_order').default(0),
});

export type ModuleRegistry = typeof module_registry.$inferSelect;
export type NewModuleRegistry = typeof module_registry.$inferInsert;
