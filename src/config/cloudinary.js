import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Original product configuration engine setup
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "venclux_products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (req, file) => `prod_${Date.now()}`,
  },
});

// 🌟 NEW: Dedicated branding storage engine configurations
const brandingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "venclux_branding",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (req, file) => `${file.fieldname}_${Date.now()}`, // saves as logo_12345 or banner_12345
  },
});

export const upload = multer({ storage: productStorage });
export const uploadBranding = multer({ storage: brandingStorage }); // Exporting the new branding middleware engine
export { cloudinary };