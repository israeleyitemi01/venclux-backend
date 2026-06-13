import Joi from "joi";

const phoneNumberSchema = Joi.string()
    .required()
    .custom((value, helpers) => {
        const normalized = value.trim().replace(/[\s()-]/g, "");
        const international = normalized.startsWith("+")
            ? normalized
            : `+234${normalized.replace(/^0+/, "")}`;

        if (!/^\+?[1-9]\d{1,14}$/.test(international)) {
            return helpers.error("string.pattern.base");
        }

        return international;
    })
    .messages({
        "string.pattern.base": "WhatsApp number must be a valid international phone number (e.g., +2348012345678)",
        "string.empty": "WhatsApp number cannot be empty",
        "any.required": "WhatsApp number is required"
    });

export const registerSchema = Joi.object({
    name: Joi.string().required().min(3).max(50).messages({
        "string.base": "owner name must be a text",
        "string.empty": "owner name cannot be empty",
        "any.required": "owner name is required",
        "string.min": "owner name must be at least 3 characters", 
    }),
    businessName: Joi.string().required().min(3).max(50).messages({
        "string.base": "Business name must be a text",
        "string.empty": "Business name cannot be empty",
        "any.required": "Business name is required",
        "string.min": "Business name must be at least 3 characters",
        "string.max": "Business name must be at most 50 characters",
    }),
    storeSlug: Joi.string().required().min(2).max(30).pattern(/^[a-z0-9-]+$/).messages({
        "string.pattern.base": "Store slug can only contain lowercase letters, numbers, and hyphens (e.g., amara-shop)",
        "string.empty": "Store slug cannot be empty",
        "any.required": "Store slug is required"
    }),
    email: Joi.string().email().required().messages({
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required"
    }), 
    password: Joi.string().required().min(8).max(100).messages({
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password must be at most 100 characters",
        "any.required": "Password is required"
    }),
    whatsappNumber: phoneNumberSchema,
    businessNiche: Joi.string().required().valid(
        "Fashion & Clothing",
        "Electronics & Gadgets",
        "Food & Beverages",
        "Beauty & Skincare",
        "Home & Living",
        "Jewelry & Accessories",
        "Other"
    ).messages({
        "any.only": "Please select a valid business niche"
    })
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required"
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required"
    })
});

// Validates the entry code when checking the 6-digit number
export const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required"
    }),
    otp: Joi.string().required().length(6).messages({
        "string.length": "Verification code must be exactly 6 digits",
        "any.required": "Verification code is required"
    })
});

// Validates the email field when clicking "Resend fresh token"
export const resendOtpSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required"
    })
});
