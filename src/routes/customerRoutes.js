import express from "express";
import { getVendorCustomers, deleteCustomer } from "../controllers/customerController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Fetch customer profiles linked to this authenticated vendor account
router.get("/", authMiddleware, getVendorCustomers);
router.delete("/:id", authMiddleware, deleteCustomer);

export default router;