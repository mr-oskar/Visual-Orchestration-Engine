import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  nodeId: text("node_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true, timestamp: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
