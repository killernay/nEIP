import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { module_registry } from './module-registry.js';

export const tenant_modules = pgTable('tenant_modules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id),
  module_code: text('module_code').notNull().references(() => module_registry.code),
  is_active: boolean('is_active').notNull().default(true),
  activated_at: timestamp('activated_at', { withTimezone: true }).defaultNow(),
  deactivated_at: timestamp('deactivated_at', { withTimezone: true }),
}, (table) => [
  unique('tenant_modules_tenant_id_module_code_unique').on(table.tenant_id, table.module_code),
]);

export type TenantModule = typeof tenant_modules.$inferSelect;
export type NewTenantModule = typeof tenant_modules.$inferInsert;
