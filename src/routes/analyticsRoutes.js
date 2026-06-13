import express from "express";
import { getAnalyticsSummary } from "../controllers/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", authMiddleware, getAnalyticsSummary);

export default router;