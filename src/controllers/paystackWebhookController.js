import { Order } from "../models/order.js";
import crypto from "crypto";
import httpStatus from "http-status";

export const handlePaystackWebhook = async (req, res) => {
    try {
        // Secure verification: Validate that this request actually came from Paystack
        const hash = crypto
            .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            return res.status(httpStatus.UNAUTHORIZED).json({ 
                success: false, 
                message: "Invalid webhook signature source." 
            });
        }

        const event = req.body;

        // Catch successful transaction charges
        if (event.event === "charge.success") {
            const { reference } = event.data;

            // Look for an order that matches this payment token reference
            const associatedOrder = await Order.findOne({ paymentReference: reference });
            
            if (associatedOrder && associatedOrder.paymentStatus !== "PAID") {
                associatedOrder.paymentStatus = "PAID";
                await associatedOrder.save();
                console.log(`[Paystack Webhook] Order reference ${reference} marked as PAID via fallback hook.`);
            }
        }

        // Paystack always expects an immediate HTTP 200 OK state response
        return res.status(httpStatus.OK).send();

    } catch (error) {
        console.error("[Paystack Webhook Processing Error]:", error.message);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            error: error.message 
        });
    }
};