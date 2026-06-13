import { User } from "../models/user.js";
import { cloudinary } from "../config/cloudinary.js";
import { extractPublicIdFromUrl } from "../utils/cloudinaryHelper.js";

export const getStorefrontConfig = async (req, res) => {
  try {
    const vendorId = req.user.id || req.user._id;
    const vendor = await User.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        storeName: vendor.businessName || "",
        tagline: vendor.tagline || "",
        storeSlug: vendor.storeSlug || "",
        description: vendor.description || "",
        whatsapp: vendor.whatsapp || "",
        instagram: vendor.instagram || "",
        email: vendor.email || "",
        logo: vendor.logo || "",
        banner: vendor.banner || "",
      },
    });
  } catch (error) {
    console.error("Error in getStorefrontConfig:", error);
    return res.status(500).json({ success: false, message: "Server error getting settings." });
  }
};

export const updateStorefrontConfig = async (req, res) => {
  try {
    const vendorId = req.user.id || req.user._id;
    const { storeName, tagline, storeSlug, description, whatsapp, instagram, email } = req.body;

    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor profile not found." });
    }

    if (storeSlug) {
      const existingSlug = await User.findOne({ 
        storeSlug: storeSlug.toLowerCase(), 
        _id: { $ne: vendorId } 
      });
      if (existingSlug) {
        return res.status(400).json({ success: false, message: "This store slug is already taken." });
      }
    }

    // Initialize fields with values coming from req.body text strings
    let updatedFields = {
      businessName: storeName,
      tagline,
      description,
      whatsapp,
      instagram,
      email,
    };

    if (storeSlug) {
      updatedFields.storeSlug = storeSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    //  BULLETPROOF CHECK 1: Ensure req.files exists before checking individual keys
    if (req.files) {
      // Handle Logo File upload safely
      if (req.files["logo"] && req.files["logo"].length > 0) {
        if (vendor.logo) {
          const oldLogoId = extractPublicIdFromUrl(vendor.logo);
          // Only attempt delete if public ID was safely extracted
          if (oldLogoId) {
            try {
              await cloudinary.uploader.destroy(oldLogoId);
            } catch (err) {
              console.error("Cloudinary old logo cleanup failed, skipping:", err);
            }
          }
        }
        updatedFields.logo = req.files["logo"][0].path; 
      }

      // Handle Banner File upload safely
      if (req.files["banner"] && req.files["banner"].length > 0) {
        if (vendor.banner) {
          const oldBannerId = extractPublicIdFromUrl(vendor.banner);
          if (oldBannerId) {
            try {
              await cloudinary.uploader.destroy(oldBannerId);
            } catch (err) {
              console.error("Cloudinary old banner cleanup failed, skipping:", err);
            }
          }
        }
        updatedFields.banner = req.files["banner"][0].path; 
      }
    }

    const updatedVendor = await User.findByIdAndUpdate(
      vendorId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Storefront configuration processed successfully.",
      user: updatedVendor,
    });
  } catch (error) {
    //  THIS WILL PRINT THE EXACT LINE THAT CRASHED YOUR SERVER IN YOUR TERMINAL
    console.error("CRITICAL EXCEPTION IN updateStorefrontConfig:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error saving storefront properties." 
    });
  }
};