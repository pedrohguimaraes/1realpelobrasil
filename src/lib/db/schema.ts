import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const candidates = pgTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  photoPath: text("photo_path").notNull(),
  colorClass: text("color_class").notNull(),
  ringClass: text("ring_class").notNull(),
  minCents: integer("min_cents").notNull(),
  amountPresets: integer("amount_presets").array().notNull(),
  provocation: text("provocation").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("pending"),
    gatewayTxId: text("gateway_tx_id").notNull(),
    pixCopiaCola: text("pix_copia_cola").notNull(),
    pixQrcodeBase64: text("pix_qrcode_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("votes_gateway_tx_id_idx").on(t.gatewayTxId)]
);

export const statsCache = pgTable("stats_cache", {
  candidateId: text("candidate_id")
    .primaryKey()
    .references(() => candidates.id),
  totalVotes: integer("total_votes").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gatewayTxId: text("gateway_tx_id").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CandidateRow = typeof candidates.$inferSelect;
export type VoteRow = typeof votes.$inferSelect;
export type StatsCacheRow = typeof statsCache.$inferSelect;
