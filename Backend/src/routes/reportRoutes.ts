import { Router } from "express";
import { createReport, getReports } from "../controllers/reportController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyToken);

router.post("/", createReport);
router.get("/", getReports);

export default router;
