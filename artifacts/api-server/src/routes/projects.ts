import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, graphNodesTable, graphEdgesTable, activityEventsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable);

  const result = await Promise.all(
    projects.map(async (p) => {
      const [nc] = await db.select({ value: count() }).from(graphNodesTable).where(eq(graphNodesTable.projectId, p.id));
      const [ec] = await db.select({ value: count() }).from(graphEdgesTable).where(eq(graphEdgesTable.projectId, p.id));
      return {
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        nodeCount: Number(nc?.value ?? 0),
        edgeCount: Number(ec?.value ?? 0),
      };
    })
  );

  res.json(result);
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: body.name,
      description: body.description ?? "",
      language: body.language ?? "python",
      pythonVersion: body.pythonVersion ?? "3.10.8",
    })
    .returning();

  res.status(201).json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    nodeCount: 0,
    edgeCount: 0,
  });
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const { projectId } = GetProjectParams.parse({ projectId: Number(req.params.projectId) });
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const [nc] = await db.select({ value: count() }).from(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  const [ec] = await db.select({ value: count() }).from(graphEdgesTable).where(eq(graphEdgesTable.projectId, projectId));

  res.json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    nodeCount: Number(nc?.value ?? 0),
    edgeCount: Number(ec?.value ?? 0),
  });
});

router.delete("/projects/:projectId", async (req, res) => {
  const { projectId } = DeleteProjectParams.parse({ projectId: Number(req.params.projectId) });
  await db.delete(graphEdgesTable).where(eq(graphEdgesTable.projectId, projectId));
  await db.delete(graphNodesTable).where(eq(graphNodesTable.projectId, projectId));
  await db.delete(activityEventsTable).where(eq(activityEventsTable.projectId, projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.status(204).send();
});

export default router;
