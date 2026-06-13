import express from "express";
import { getPublicStorefront, processWebCheckout } from "../controllers/publicStoreController.js";

const router = express.Router();

// 1. GET dynamic catalog configuration metrics by store slug
router.get("/:storeSlug", getPublicStorefront);

// 2. POST execute storefront checkout & secure Paystack verification
router.post("/:storeSlug/checkout", processWebCheckout);

export default router;