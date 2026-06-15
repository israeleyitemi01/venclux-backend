import express from "express";
import { getAllOrders, updateOrderStatus } from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router(); 

// 1. GET Route: Fetch all orders
router.get("/all", authMiddleware, getAllOrders);

// 2. PUT Route: Update order status by trackingId
router.put("/update/:trackingId", authMiddleware, updateOrderStatus);

export default router;