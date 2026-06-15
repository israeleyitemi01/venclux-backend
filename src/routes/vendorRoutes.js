import express from "express";
import { setupVendorPayout } from "../controllers/vendorPayoutController.js";
import { getStorefrontConfig, updateStorefrontConfig } from "../controllers/storefrontController.js";
import { uploadBranding } from "../config/cloudinary.js"; // Pulling our new engine parameters mount
import authMiddleware from "../middleware/authMiddleware.js";
import { getSettings, updateStoreSettings, updateNotificationSettings, getBillingMetrics, uploadProfilePicture, deleteAccount, updateProfileSettings, clearNotifications } from "../controllers/userSettingsController.js";
import { globalSearch } from "../controllers/searchController.js";

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
router.get("/settings", authMiddleware, getSettings);
router.put("/settings/store", authMiddleware, updateStoreSettings);
router.put("/settings/notifications", authMiddleware, updateNotificationSettings);
router.get("/settings/billing", authMiddleware, getBillingMetrics);
router.put("/settings/notifications/clear", authMiddleware, clearNotifications);

// Profile picture upload
router.put(
  "/settings/profile-picture",
  authMiddleware,
  uploadBranding.single("image"),
  uploadProfilePicture
);

router.put("/settings/profile", authMiddleware, updateProfileSettings);

// Account deletion
router.delete("/settings/account", authMiddleware, deleteAccount);

// Global Search
router.get("/search", authMiddleware, globalSearch);

export default router;