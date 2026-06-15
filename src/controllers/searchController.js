import { Product } from "../models/product.js";
import { Order } from "../models/order.js";
import { Customer } from "../models/customer.js";
import httpStatus from "http-status";

export const globalSearch = async (req, res) => {
  try {
    const query = req.query.q || "";
    const vendorId = req.user.id;

    if (!query) {
      return res.status(httpStatus.OK).json({
        success: true,
        data: { products: [], orders: [], customers: [] }
      });
    }

    const regex = new RegExp(query, "i");

    // Search Products
    const products = await Product.find({
      vendorId,
      name: { $regex: regex }
    }).limit(10);

    // Search Orders
    const orders = await Order.find({
      vendorId,
      $or: [
        { trackingId: { $regex: regex } },
        { customerName: { $regex: regex } },
        { customerEmail: { $regex: regex } },
        { customerWhatsapp: { $regex: regex } }
      ]
    }).limit(10);

    // Search Customers
    const customers = await Customer.find({
      vendorId,
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { phoneNumber: { $regex: regex } }
      ]
    }).limit(10);

    res.status(httpStatus.OK).json({
      success: true,
      data: { products, orders, customers }
    });

  } catch (error) {
    console.error("[Search Controller Error]:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while searching the platform.",
      error: error.message
    });
  }
};
