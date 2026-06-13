import express from "express";
import twilio from "twilio";
import { User } from "../models/user.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";

const router = express.Router();
const { MessagingResponse } = twilio.twiml;

router.post("/api/webhook", async (req, res) => {
  const incomingMessage = req.body.Body ? req.body.Body.trim() : "";
  const lowerMessage = incomingMessage.toLowerCase();
  const senderNumber = req.body.From;     // The buyer's WhatsApp number (e.g., whatsapp:+234...)
  const receiverNumber = req.body.To;     // The Vendor's system number (e.g., whatsapp:+1415...)

  console.log(
    `[Venclux Automation] Route Hit: "${incomingMessage}" from ${senderNumber} to recipient ${receiverNumber}`
  );

  const twiml = new MessagingResponse();

  try {
    // 1. DYNAMIC TENANT LOOKUP: Identify which vendor owns this inbound number connection
    const vendor = await User.findOne({ whatsappNumber: receiverNumber });
    
    if (!vendor) {
      twiml.message(
        "👋 Welcome to Venclux!\n\nThis WhatsApp commerce number is currently unassigned to an active merchant hub. Please contact support or your vendor administrator."
      );
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    const storeName = vendor.businessName;
    const vendorId = vendor._id;

    // ACTION 1: BROWSE CATALOG
    if (lowerMessage === "products" || lowerMessage === "view shop") {
      // Isolate the query to return only this specific vendor's products
      const products = await Product.find({ vendorId, isAvailable: true }).limit(5);

      if (!products || products.length === 0) {
        twiml.message(
          `🛍️ *${storeName}*\n\nOur catalog is currently being updated. Please check back soon or visit our web store!`,
        );
      } else {
        let catalogMessage = `🛍️ *${storeName} - Live Catalog*\n\nReply with *Order [Number]* to secure yours instantly! (e.g., *Order 1*)\n\n`;
        products.forEach((product, index) => {
          catalogMessage += `${index + 1}. ${product.name} - *₦${product.price.toLocaleString()}*\n`;
        });
        twiml.message(catalogMessage);
      }
    }

    // ACTION 2: INITIATE ORDER (Create DB record dynamically under tenant scope)
    else if (lowerMessage.startsWith("order ")) {
      const listIndex = parseInt(lowerMessage.replace("order ", "").trim()) - 1;
      const products = await Product.find({ vendorId, isAvailable: true }).limit(5);

      if (isNaN(listIndex) || listIndex < 0 || listIndex >= products.length) {
        twiml.message(
          "❌ Invalid selection. Please reply with a valid number from the catalog (e.g., *Order 1*).",
        );
      } else {
        const selectedProduct = products[listIndex];

        // Generate a random, 6-digit numeric tracking ID
        const generatedTrackingId = Math.floor(100000 + Math.random() * 900000).toString();

        // Save a live pending order with explicit multi-tenant parameters
        const newOrder = new Order({
          vendorId,
          orderSource: "WHATSAPP",
          customerWhatsapp: senderNumber,
          trackingId: generatedTrackingId,
          items: [{ productId: selectedProduct._id, quantity: 1 }],
          totalAmount: selectedProduct.price,
          status: "PENDING",
        });
        await newOrder.save();

        twiml.message(
          `🛒 *Order Initiated Successfully!*\n\nItem: *${selectedProduct.name}*\nTotal: *₦${selectedProduct.price.toLocaleString()}*\nTracking ID: *${generatedTrackingId}*\n\n🚚 To complete booking, please reply with your delivery details exactly like this:\n\n*Delivery: Your Full Name, Your Address*`,
        );
      }
    }

    // ACTION 3: CAPTURE DELIVERY DETAILS (Update existing record under tenant scope)
    else if (lowerMessage.startsWith("delivery:")) {
      const addressDetails = incomingMessage.replace(/delivery:/i, "").trim();

      // Find the most recent pending order created by the specific phone number for this vendor
      const latestOrder = await Order.findOne({
        vendorId,
        customerWhatsapp: senderNumber,
        status: "PENDING",
      }).sort({ createdAt: -1 });

      if (!latestOrder) {
        twiml.message(
          `🤔 No active pending orders found for your number at ${storeName}. Type *Products* to start shopping!`,
        );
      } else {
        latestOrder.deliveryAddress = addressDetails;
        await latestOrder.save();

        twiml.message(
          `✅ *Booking Confirmed, ${storeName} is on it!*\n\nYour shipping address has been added to Track ID: *${latestOrder.trackingId}*.\n\nYou will receive an update as soon as our dispatch rider leaves the hub. Type *Track ${latestOrder.trackingId}* anytime to view status!`,
        );
      }
    }

    // ACTION 4: LIVE ORDER TRACKING (Read from DB within tenant context)
    else if (lowerMessage === "track") {
      twiml.message(
        "📦 *Venclux Order Tracker*\n\nPlease provide your tracking ID to search (e.g., *Track 482019*)",
      );
    } else if (lowerMessage.startsWith("track ")) {
      const inputId = lowerMessage.replace("track ", "").trim();

      // Query database for the exact tracking code inside this vendor's parameters
      const foundOrder = await Order.findOne({ trackingId: inputId, vendorId }).populate(
        "items.productId",
      );

      if (!foundOrder) {
        twiml.message(
          `🔍 *Order Not Found*\n\nWe couldn't find any booking matching ID: *${inputId}* under ${storeName}. Please double-check your numbers.`,
        );
      } else {
        const productName = foundOrder.items[0]?.productId?.name || "Product Item";
        twiml.message(
          `🔍 *Live Order Status for #${foundOrder.trackingId}*\n\nItem: *${productName}*\nStatus: *${foundOrder.status}* ⏳\nDestination: *${foundOrder.deliveryAddress || "Not provided yet"}*\n\n_Powered by ${storeName} via Venclux Node Control._`,
        );
      }
    }

    // DEFAULT HELP MENU
    else if (lowerMessage === "help" || lowerMessage === "hello") {
      twiml.message(
        `👋 *Welcome to ${storeName}'s Automated Shop Assistant*\n\nHow can we assist you today? Reply with a keyword:\n\n• *Products* - Browse available items\n• *Track* - Check order delivery status\n• *Help* - View this guide`,
      );
    }
    
    // CATCH-ALL UNKNOWN COMMANDS
    else {
      twiml.message(
        "🤔 Command not recognized.\n\nReply with *Help* to see how you can shop or track an order automatically!",
      );
    }

  } catch (error) {
    console.error("[Venclux Critical Webhook Exception]:", error);
    twiml.message("❌ System error handling your request. Please try again later.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

export default router;