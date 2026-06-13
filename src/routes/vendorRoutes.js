import express from "express";
import { setupVendorPayout } from "../controllers/vendorPayoutController.js";
import { getStorefrontConfig, updateStorefrontConfig } from "../controllers/storefrontController.js";
import { uploadBranding } from "../config/cloudinary.js"; // Pulling our new engine parameters mount
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/payout-setup", authMiddleware, setupVendorPayout);

//  UPDATED: Intercepting incoming multi-form data files seamlessly
router.get("/storefront/config", authMiddleware, getStorefrontConfig);
router.put(
  "/storefront/config", 
  authMiddleware, 
  uploadBranding.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 }
  ]), 
  updateStorefrontConfig
);

export default router;