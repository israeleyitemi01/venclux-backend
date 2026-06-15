import { Order } from "../models/order.js";
import httpStatus from "http-status";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

/**
 * Fetch all orders sorted by latest entry
 */
export const getAllOrders = async (req, res) => {
  try {
    const vendorId = req.user._id || req.user.id;
    const orders = await Order.find({ vendorId: vendorId.toString() })
      .populate("items.productId")
      .sort({ createdAt: -1 });
      
    return res.status(httpStatus.OK).json({ 
      success: true, 
      orders 
    });
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error fetching orders from database",
      error: error.message,
    });
  }
};

/**
 * Update order tracking status and dispatch WhatsApp notifications
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { status } = req.body; // Expecting: "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"

    if (!status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Status parameter is required."
      });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { trackingId },
      { status: status.toUpperCase() },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(httpStatus.NOT_FOUND).json({ 
        success: false, 
        message: "Order not found"
      });
    }

    // --- VENCLUX AUTOMATION PUSH NOTIFICATION ---
    try {
      const upperStatus = status.toUpperCase();
      let statusEmoji = "📦";
      let statusNote = `Your order status has been updated to ${upperStatus}.`;

      if (upperStatus === "SHIPPED") {
        statusEmoji = "🚚";
        statusNote = "Our dispatch rider has picked up your package and is heading your way.";
      } else if (upperStatus === "DELIVERED") {
        statusEmoji = "✅";
        statusNote = "Your order has been successfully delivered! Thank you for shopping with us.";
      } else if (upperStatus === "PROCESSING") {
        statusEmoji = "⚡";
        statusNote = "Your order is now being processed and packed by the merchant.";
      }

      await twilioClient.messages.create({
        from: whatsappNumber,
        to: updatedOrder.customerWhatsapp,
        body: `${statusEmoji} *Venclux Order Update*\n\nHello! Your order *#${trackingId}* status has been updated to: *${upperStatus}*.\n\n${statusNote}`
      });

      console.log(`[Venclux] Outbound notification sent successfully to ${updatedOrder.customerWhatsapp}`);
    } catch (smsError) {
      console.error("Failed to send outbound WhatsApp notification:", smsError.message);
    }
    // --------------------------------------------

    return res.status(httpStatus.OK).json({ 
      success: true, 
      message: `Order status updated to ${status} and notification pushed!`, 
      order: updatedOrder 
    });
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: "Error updating order metadata", 
      error: error.message 
    });
  }
};