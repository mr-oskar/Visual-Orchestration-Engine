import { Router } from "express";
import { db } from "@workspace/db";
import { graphNodesTable, graphEdgesTable, activityEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetProjectGraphParams,
  ListNodesParams,
  GetNodeParams,
  UpdateNodePositionParams,
  UpdateNodePositionBody,
  ListEdgesParams,
  CreateEdgeParams,
  CreateEdgeBody,
  DeleteEdgeParams,
  FetchNodeCodeParams,
  GetProjectStatsParams,
  GetProjectActivityParams,
  CreateNodeParams,
  CreateNodeBody,
  DeleteNodeParams,
} from "@workspace/api-zod";

const router = Router();

function parseNode(n: typeof graphNodesTable.$inferSelect) {
  return {
    id: n.id,
    projectId: n.projectId,
    nodeType: n.nodeType,
    label: n.label,
    filePath: n.filePath,
    parentNodeId: n.parentNodeId,
    positionX: n.positionX,
    positionY: n.positionY,
    width: n.width,
    height: n.height,
    inputTypes: JSON.parse(n.inputTypes || "[]"),
    outputTypes: JSON.parse(n.outputTypes || "[]"),
    lineNumber: n.lineNumber,
    complexity: n.complexity,
    isCollapsed: n.isCollapsed,
  };
}

function parseEdge(e: typeof graphEdgesTable.$inferSelect) {
  return {
    id: e.id,
    projectId: e.projectId,
    sourceNodeId: e.sourceNodeId,
    targetNodeId: e.targetNodeId,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    edgeType: e.edgeType,
    dataType: e.dataType,
  };
}

router.get("/projects/:projectId/graph", async (req, res) => {
  const { projectId } = GetProjectGraphParams.parse({ projectId: Number(req.params.projectId) });
  const nodes = await db.select().from(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  const edges = await db.select().from(graphEdgesTable).where(eq(graphEdgesTable.projectId, projectId));
  res.json({
    projectId,
    nodes: nodes.map(parseNode),
    edges: edges.map(parseEdge),
  });
});

router.get("/projects/:projectId/nodes", async (req, res) => {
  const { projectId } = ListNodesParams.parse({ projectId: Number(req.params.projectId) });
  const nodes = await db.select().from(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  res.json(nodes.map(parseNode));
});

router.post("/projects/:projectId/nodes", async (req, res) => {
  const { projectId } = CreateNodeParams.parse({ projectId: Number(req.params.projectId) });
  const body = CreateNodeBody.parse(req.body);

  const NODE_DEFAULTS: Record<string, { width: number; height: number }> = {
    folder: { width: 400, height: 300 },
    file: { width: 300, height: 220 },
    class: { width: 260, height: 180 },
    function: { width: 200, height: 80 },
  };
  const defaults = NODE_DEFAULTS[body.nodeType] ?? { width: 200, height: 80 };

  const id = `${body.nodeType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const [node] = await db.insert(graphNodesTable).values({
    id,
    projectId,
    nodeType: body.nodeType,
    label: body.label,
    filePath: body.filePath,
    parentNodeId: body.parentNodeId ?? null,
    positionX: body.positionX ?? 100,
    positionY: body.positionY ?? 100,
    width: body.width ?? defaults.width,
    height: body.height ?? defaults.height,
    inputTypes: "[]",
    outputTypes: "[]",
    codeContent: body.codeContent ?? `# ${body.label}\n`,
  }).returning();

  await db.insert(activityEventsTable).values({
    projectId,
    eventType: "node_created",
    description: `Created ${body.nodeType} "${body.label}"`,
    nodeId: id,
  });

  res.status(201).json(parseNode(node));
});

router.delete("/projects/:projectId/nodes/:nodeId", async (req, res) => {
  const { projectId, nodeId } = DeleteNodeParams.parse({
    projectId: Number(req.params.projectId),
    nodeId: req.params.nodeId,
  });

  // Recursively find and delete all descendants
  const allNodes = await db.select().from(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  const toDelete = collectDescendants(nodeId, allNodes);
  toDelete.push(nodeId);

  for (const id of toDelete) {
    await db.delete(graphEdgesTable).where(
      and(eq(graphEdgesTable.projectId, projectId), eq(graphEdgesTable.sourceNodeId, id))
    );
    await db.delete(graphEdgesTable).where(
      and(eq(graphEdgesTable.projectId, projectId), eq(graphEdgesTable.targetNodeId, id))
    );
    await db.delete(graphNodesTable).where(
      and(eq(graphNodesTable.projectId, projectId), eq(graphNodesTable.id, id))
    );
  }

  await db.insert(activityEventsTable).values({
    projectId,
    eventType: "node_deleted",
    description: `Deleted node "${nodeId}" and ${toDelete.length - 1} descendant(s)`,
    nodeId,
  });

  res.status(204).send();
});

function collectDescendants(
  parentId: string,
  allNodes: (typeof graphNodesTable.$inferSelect)[]
): string[] {
  const children = allNodes.filter((n) => n.parentNodeId === parentId);
  return children.flatMap((c) => [c.id, ...collectDescendants(c.id, allNodes)]);
}

router.get("/projects/:projectId/nodes/:nodeId", async (req, res): Promise<void> => {
  const { projectId, nodeId } = GetNodeParams.parse({
    projectId: Number(req.params.projectId),
    nodeId: req.params.nodeId,
  });
  const [node] = await db
    .select()
    .from(graphNodesTable)
    .where(and(eq(graphNodesTable.projectId, projectId), eq(graphNodesTable.id, nodeId)));

  if (!node) { res.status(404).json({ error: "Node not found" }); return; }

  const metadata = buildMetadata(node);

  res.json({
    node: parseNode(node),
    code: node.codeContent || `# ${node.label}\n# No code content available`,
    metadata,
  });
});

router.patch("/projects/:projectId/nodes/:nodeId", async (req, res): Promise<void> => {
  const { projectId, nodeId } = UpdateNodePositionParams.parse({
    projectId: Number(req.params.projectId),
    nodeId: req.params.nodeId,
  });
  const body = UpdateNodePositionBody.parse(req.body);

  const updateData: Partial<typeof graphNodesTable.$inferInsert> = {};
  if (body.positionX !== undefined) updateData.positionX = body.positionX;
  if (body.positionY !== undefined) updateData.positionY = body.positionY;
  if (body.isCollapsed !== undefined) updateData.isCollapsed = body.isCollapsed;
  if (body.codeContent !== undefined) updateData.codeContent = body.codeContent;

  const [updated] = await db
    .update(graphNodesTable)
    .set(updateData)
    .where(and(eq(graphNodesTable.projectId, projectId), eq(graphNodesTable.id, nodeId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Node not found" }); return; }
  res.json(parseNode(updated));
});

router.get("/projects/:projectId/edges", async (req, res) => {
  const { projectId } = ListEdgesParams.parse({ projectId: Number(req.params.projectId) });
  const edges = await db.select().from(graphEdgesTable).where(eq(graphEdgesTable.projectId, projectId));
  res.json(edges.map(parseEdge));
});

router.post("/projects/:projectId/edges", async (req, res) => {
  const { projectId } = CreateEdgeParams.parse({ projectId: Number(req.params.projectId) });
  const body = CreateEdgeBody.parse(req.body);

  const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const [edge] = await db
    .insert(graphEdgesTable)
    .values({
      id,
      projectId,
      sourceNodeId: body.sourceNodeId,
      targetNodeId: body.targetNodeId,
      sourceHandle: body.sourceHandle,
      targetHandle: body.targetHandle,
      edgeType: body.edgeType ?? "dataflow",
      dataType: body.dataType ?? null,
    })
    .returning();

  await db.insert(activityEventsTable).values({
    projectId,
    eventType: "edge_created",
    description: `Connected ${body.sourceNodeId} → ${body.targetNodeId}`,
    nodeId: body.sourceNodeId,
  });

  res.status(201).json(parseEdge(edge));
});

router.delete("/projects/:projectId/edges/:edgeId", async (req, res) => {
  const { projectId, edgeId } = DeleteEdgeParams.parse({
    projectId: Number(req.params.projectId),
    edgeId: req.params.edgeId,
  });
  await db.delete(graphEdgesTable).where(
    and(eq(graphEdgesTable.projectId, projectId), eq(graphEdgesTable.id, edgeId))
  );
  res.status(204).send();
});

router.get("/projects/:projectId/nodes/:nodeId/code", async (req, res): Promise<void> => {
  const { projectId, nodeId } = FetchNodeCodeParams.parse({
    projectId: Number(req.params.projectId),
    nodeId: req.params.nodeId,
  });
  const [node] = await db
    .select()
    .from(graphNodesTable)
    .where(and(eq(graphNodesTable.projectId, projectId), eq(graphNodesTable.id, nodeId)));

  if (!node) { res.status(404).json({ error: "Node not found" }); return; }

  res.json({
    nodeId,
    filePath: node.filePath,
    code: node.codeContent || `# ${node.label}\n# No code content available`,
    language: "python",
  });
});

router.get("/projects/:projectId/stats", async (req, res) => {
  const { projectId } = GetProjectStatsParams.parse({ projectId: Number(req.params.projectId) });
  const nodes = await db.select().from(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  const edges = await db.select().from(graphEdgesTable).where(eq(graphEdgesTable.projectId, projectId));

  const folderCount = nodes.filter((n) => n.nodeType === "folder").length;
  const fileCount = nodes.filter((n) => n.nodeType === "file").length;
  const classCount = nodes.filter((n) => n.nodeType === "class").length;
  const functionCount = nodes.filter((n) => n.nodeType === "function").length;
  const complexities = nodes.filter((n) => n.complexity !== null).map((n) => n.complexity!);
  const avgComplexity = complexities.length ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 0;
  const highComplexityNodes = complexities.filter((c) => c > 7).length;

  res.json({
    projectId,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    folderCount,
    fileCount,
    classCount,
    functionCount,
    avgComplexity: Math.round(avgComplexity * 10) / 10,
    highComplexityNodes,
  });
});

router.get("/projects/:projectId/activity", async (req, res) => {
  const { projectId } = GetProjectActivityParams.parse({ projectId: Number(req.params.projectId) });
  const events = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.projectId, projectId))
    .orderBy(activityEventsTable.timestamp);

  res.json(
    events.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }))
  );
});

function buildMetadata(node: typeof graphNodesTable.$inferSelect) {
  const inputs = JSON.parse(node.inputTypes || "[]");
  const outputs = JSON.parse(node.outputTypes || "[]");
  const typeLabels: Record<string, string> = {
    folder: "Folder",
    file: "File",
    class: "Class",
    function: "Function",
  };
  return {
    type: typeLabels[node.nodeType] ?? node.nodeType,
    definedIn: node.filePath + (node.lineNumber ? `:${node.lineNumber}` : ""),
    inputs: inputs.length ? inputs.join(", ") : "None",
    outputs: outputs.length ? outputs.join(", ") : "None",
    usedBy: null,
    complexity: node.complexity ? `${node.complexity} (${node.complexity <= 4 ? "Low" : node.complexity <= 7 ? "Medium" : "High"})` : "N/A",
    lastModified: "2 days ago",
  };
}

export default router;
