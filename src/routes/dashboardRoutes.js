import express from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/dashboard - Accesses live metrics summaries for the authenticated merchant
router.get("/summary", authMiddleware, getDashboardSummary);

export default router;