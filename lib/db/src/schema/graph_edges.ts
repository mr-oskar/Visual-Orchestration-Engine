import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const graphEdgesTable = pgTable("graph_edges", {
  id: text("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  sourceNodeId: text("source_node_id").notNull(),
  targetNodeId: text("target_node_id").notNull(),
  sourceHandle: text("source_handle").notNull().default("output"),
  targetHandle: text("target_handle").notNull().default("input"),
  edgeType: text("edge_type").notNull().default("dataflow"),
  dataType: text("data_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGraphEdgeSchema = createInsertSchema(graphEdgesTable).omit({ createdAt: true });
export type InsertGraphEdge = z.infer<typeof insertGraphEdgeSchema>;
export type GraphEdge = typeof graphEdgesTable.$inferSelect;
