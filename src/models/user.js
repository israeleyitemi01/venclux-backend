// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//     {
//         name: {
//             type: String,
//             required: [true, "Owner name specification is required."],
//             trim: true
//         },
//         email: {
//             type: String,
//             required: [true, "A unique registration email is required."],
//             unique: true,
//             lowercase: true,
//             trim: true
//         },
//         password: {
//             type: String,
//             required: [true, "Secure access key credential is required."],
//             minlength: 8
//         },
//         businessName: {
//             type: String,
//             required: [true, "Business identifier title is required."],
//             trim: true
//         },
//         storeSlug: {
//             type: String,
//             required: [true, "Store routing slug parameter is mandatory."],
//             unique: true,
//             lowercase: true,
//             trim: true
//         },
//         whatsappNumber: {
//             type: String,
//             required: [true, "WhatsApp target string is mandatory for automated transaction updates."],
//             trim: true
//         },
//         businessNiche: {
//             type: String,
//             required: [true, "Business niche categorization must be declared."],
//             enum: [
//                 "Fashion & Clothing",
//                 "Electronics & Gadgets",
//                 "Food & Beverages",
//                 "Beauty & Skincare",
//                 "Home & Living",
//                 "Jewelry & Accessories",
//                 "Other"
//             ]
//         },
//         deliveryFee: {
//             type: Number,
//             default: 0
//         },
//         paystackSubaccountCode: {
//             type: String,
//             default: ""
//         },
//         isVerified: {
//             type: Boolean,
//             default: false // Becomes true after successful OTP verification matching
//         },
//         verificationOtp: {
//             type: String,
//             default: null
//         },
//         otpExpiry: {
//             type: Date,
//             default: null
//         },
//         logo: {
//             type: String,
//             default: null
//         },
//         banner: {
//             type: String,
//             default: null
//         },
//         tagline: {
//             type: String,
//             default: ""
//         },
//         description: {
//             type: String,
//             default: ""
//         }
//     },
//     { timestamps: true }
// );

// export const User = mongoose.model("User", userSchema);




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
        profilePicture: {
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
        },
        
        // ─── NEW SETTINGS CONFIGURATIONS ───
        currency: { 
            type: String, 
            default: "NGN" 
        },
        language: { 
            type: String, 
            default: "en" 
        },
        timezone: { 
            type: String, 
            default: "Africa/Lagos" 
        },
        country: { 
            type: String, 
            default: "Nigeria" 
        },
        
        // Dynamic subscription state tracking
        subscription: {
            plan: { type: String, enum: ["Free", "Pro"], default: "Free" },
            status: { type: String, enum: ["Active", "Past Due", "Canceled"], default: "Active" },
            renewsAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // Default 30 days out
            amount: { type: Number, default: 0 }
        },

        // Embedded notification configurations
        notifications: {
            newOrder: { type: Boolean, default: true },
            orderPaid: { type: Boolean, default: true },
            lowStock: { type: Boolean, default: true },
            customerMsg: { type: Boolean, default: false },
            weeklyReport: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false }
        }
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);