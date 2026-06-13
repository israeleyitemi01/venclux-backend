import Joi from "joi";

export const productSchema = Joi.object({
  name: Joi.string().required().min(3).max(50).messages({
    "string.base": "Product name must be text",
    "string.empty": "Product name cannot be empty",
    "string.min": "Product name must be at least 3 characters",
    "string.max": "Product name must be at most 50 characters",
    "any.required": "Product name is required",
  }),
  description: Joi.string().allow("").max(500).messages({
    "string.base": "Description must be text",
    "string.max": "Description must be at most 500 characters",
  }),
  price: Joi.number().required().positive().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  stock: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Stock must be a valid number",
    "number.min": "Stock cannot be less than 0",
  }),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  // Allow an optional string URL fallback, but accept any file processing adjustments from Multer
  image: Joi.string().allow("", null).optional().messages({
    "string.base": "Image path must be text",
 }),
  category: Joi.string()
    .valid("Clothing", "Accessories", "Electronics", "Uncategorized")
    .default("Uncategorized")
    .messages({
      "any.only": "Category must be either Clothing, Accessories, Electronics, or Uncategorized",
    }),
  badge: Joi.string().allow("", null).optional(),
});

// Update fields fork to automatically make all database keys optional for updates
export const updateProductSchema = productSchema.fork(
  ["name", "price", "description", "image", "stock", "category", "lowStockThreshold", "badge"],
  (schema) => schema.optional()
);