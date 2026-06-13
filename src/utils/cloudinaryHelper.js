/**
 * Extracts Cloudinary public ID from a secure image URL string
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1234/venclux_products/prod_167000.png
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/");
    const folderIndex = parts.indexOf("venclux_products");
    if (folderIndex !== -1) {
      const publicIdWithExtension = parts.slice(folderIndex).join("/"); // "venclux_products/prod_167000.png"
      return publicIdWithExtension.split(".")[0]; // "venclux_products/prod_167000"
    }
    return null;
  } catch (error) {
    console.error("Failed to parse public ID:", error);
    return null;
  }
};