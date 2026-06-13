import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    storeSlug: { type: String, required: true }, //  dashboards filters by store!
    orderSource: { type: String, default: "WEB_STOREFRONT" },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerWhatsapp: { type: String, required: true },
    deliveryAddress: { type: String },
    deliveryNotes: { type: String },
    trackingId: { type: String, required: true, unique: true },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        // If dashboard uses item.product instead of item.productId, add this fallback line:
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, default: "Store Product" },
        productName: { type: String, default: "Store Product" },
        price: { type: Number, default: 0 },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    paymentReference: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
