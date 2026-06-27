import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const graphNodesTable = pgTable("graph_nodes", {
  id: text("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  nodeType: text("node_type").notNull(),
  label: text("label").notNull(),
  filePath: text("file_path").notNull().default(""),
  parentNodeId: text("parent_node_id"),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  width: real("width").notNull().default(200),
  height: real("height").notNull().default(80),
  inputTypes: text("input_types").notNull().default("[]"),
  outputTypes: text("output_types").notNull().default("[]"),
  lineNumber: integer("line_number"),
  complexity: integer("complexity"),
  isCollapsed: boolean("is_collapsed").notNull().default(false),
  codeContent: text("code_content").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGraphNodeSchema = createInsertSchema(graphNodesTable).omit({ createdAt: true });
export type InsertGraphNode = z.infer<typeof insertGraphNodeSchema>;
export type GraphNode = typeof graphNodesTable.$inferSelect;
