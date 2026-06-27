import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import graphRouter from "./graph";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(graphRouter);

export default router;
