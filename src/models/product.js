// import mongoose from "mongoose";

// const productSchema = new mongoose.Schema(
//     {
//         vendorId: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User", // Points to your multi-tenant vendor model
//             required: [true, "A product must belong to a verified merchant account."]
//         },
//         name: {
//             type: String,
//             required: [true, "Product name specification is required."],
//             trim: true
//         },
//         description: {
//             type: String,
//             trim: true,
//             default: ""
//         },
//         price: {
//             type: Number,
//             required: [true, "Product pricing parameters must be declared."],
//             min: [0, "Pricing variables cannot fall below zero."]
//         },
//         image: {
//             type: String, // URL string to hosting service (or placeholder image strings)
//             default: ""
//         },
//         category: {
//             type: String,
//             required: [true, "Product must be assigned to an organizational category."],
//             trim: true,
//             index: true // Indexed for rapid querying and scaling
//         },
//         stock: {
//             type: Number,
//             default: 10, // Safeguard to monitor inventory exhaustion parameters
//             min: 0
//         },
//         isAvailable: {
//             type: Boolean,
//             default: true
//         }
//     },
//     {
//         timestamps: true // Automatically tracks createdAt and updatedAt
//     }
// );

// export const Product = mongoose.model("Product", productSchema);



import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["Clothing", "Accessories", "Electronics", "Uncategorized"],
      default: "Uncategorized",
    },
    badge: {
      type: String,
      default: null, // e.g., "New", "Hot", "-20%"
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
  },
  { timestamps: true }
);

// Virtual field to dynamically calculate low stock status
productSchema.virtual("lowStock").get(function () {
  return this.stock <= this.lowStockThreshold;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export const Product = mongoose.model("Product", productSchema);