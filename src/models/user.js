import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Owner name specification is required."],
            trim: true
        },
        email: {
            type: String,
            required: [true, "A unique registration email is required."],
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Secure access key credential is required."],
            minlength: 8
        },
        businessName: {
            type: String,
            required: [true, "Business identifier title is required."],
            trim: true
        },
        storeSlug: {
            type: String,
            required: [true, "Store routing slug parameter is mandatory."],
            unique: true,
            lowercase: true,
            trim: true
        },
        whatsappNumber: {
            type: String,
            required: [true, "WhatsApp target string is mandatory for automated transaction updates."],
            trim: true
        },
        businessNiche: {
            type: String,
            required: [true, "Business niche categorization must be declared."],
            enum: [
                "Fashion & Clothing",
                "Electronics & Gadgets",
                "Food & Beverages",
                "Beauty & Skincare",
                "Home & Living",
                "Jewelry & Accessories",
                "Other"
            ]
        },
        deliveryFee: {
            type: Number,
            default: 0
        },
        paystackSubaccountCode: {
            type: String,
            default: ""
        },
        isVerified: {
            type: Boolean,
            default: false // Becomes true after successful OTP verification matching
        },
        verificationOtp: {
            type: String,
            default: null
        },
        otpExpiry: {
            type: Date,
            default: null
        },
        logo: {
            type: String,
            default: null
        },
        banner: {
            type: String,
            default: null
        },
        tagline: {
            type: String,
            default: ""
        },
        description: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);