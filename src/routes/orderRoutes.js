import express from "express";
import { getAllOrders, updateOrderStatus } from "../controllers/orderController.js";

const router = express.Router(); 

// 1. GET Route: Fetch all orders
router.get("/all", getAllOrders);

// 2. PUT Route: Update order status by trackingId
router.put("/update/:trackingId", updateOrderStatus);

export default router;