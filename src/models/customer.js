import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "New Customer",
    },
    email: { 
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    waid: {
      type: String,
      required: true,
    }, // This is the unique WhatsApp ID Meta sends
    tags: [String], // For categorizing customers (e.g., "VIP", "Frequent Buyer")
    totalLTV: {
      type: Number,
      default: 0,
    }, // Lifetime Value
  },
  { timestamps: true },
);

export const Customer = mongoose.model("Customer", customerSchema);
