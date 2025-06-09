
import { serial, text, pgTable, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Define enums
export const rsvpResponseEnum = pgEnum('rsvp_response', ['Yes', 'Maybe', 'No']);
export const deviceTypeEnum = pgEnum('device_type', ['iPhone', 'Android', 'Other']);

// RSVP table
export const rsvpsTable = pgTable('rsvps', {
  id: serial('id').primaryKey(),
  phone_number: text('phone_number').notNull().unique(), // 10-digit phone number used as unique identifier
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  response: rsvpResponseEnum('response').notNull(),
  comment: text('comment'), // Nullable - guests can optionally leave a comment
  device_type: deviceTypeEnum('device_type'), // Nullable - only set for Yes/Maybe responses
  wallet_pass_id: text('wallet_pass_id'), // Nullable - PassNinja pass ID
  wallet_pass_url: text('wallet_pass_url'), // Nullable - PassNinja pass URL
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type Rsvp = typeof rsvpsTable.$inferSelect;
export type NewRsvp = typeof rsvpsTable.$inferInsert;

// Export all tables for relation queries
export const tables = { rsvps: rsvpsTable };
