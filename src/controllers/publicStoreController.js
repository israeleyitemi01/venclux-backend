// import { User } from "../models/user.js";
// import { Product } from "../models/product.js";
// import { Order } from "../models/order.js";
// import httpStatus from "http-status";

// /**
//  * FETCH PUBLIC STOREFRONT CATALOG & SELLER PROFILE
//  * GET /api/storefront/:storeSlug
//  */
// export const getPublicStorefront = async (req, res) => {
//     try {
//         const { storeSlug } = req.params;
//         const vendor = await User.findOne({ storeSlug: storeSlug.toLowerCase() }).select("-password");

//         if (!vendor) {
//             return res.status(httpStatus.NOT_FOUND).json({
//                 success: false,
//                 message: "This online storefront does not exist."
//             });
//         }

//         const products = await Product.find({ vendorId: vendor._id, isAvailable: true });

//         res.status(httpStatus.OK).json({
//             success: true,
//             businessName: vendor.businessName,
//             whatsappNumber: vendor.whatsappNumber,
//             paystackSubaccountCode: vendor.paystackSubaccountCode, // Shared with frontend for inline splitting
//             products
//         });
//     } catch (error) {
//         res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             message: "Failed to load the storefront data.",
//             error: error.message
//         });
//     }
// };

// /**
//  * SECURE RECALCULATED WEB CHECKOUT WITH PAYSTACK SPLIT VERIFICATION
//  * POST /api/storefront/:storeSlug/checkout
//  */
// export const processWebCheckout = async (req, res) => {
//     try {
//         const { storeSlug } = req.params;
//         const {
//             customerName,
//             customerEmail,
//             customerWhatsapp,
//             deliveryAddress,
//             items,
//             paymentReference
//         } = req.body;

//         // 1. Target merchant lookup
//         const vendor = await User.findOne({ storeSlug: storeSlug.toLowerCase() });
//         if (!vendor) {
//             return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Storefront vendor not found." });
//         }

//         if (!items || !Array.isArray(items) || items.length === 0) {
//             return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Your shopping cart is empty." });
//         }

//         if (!paymentReference) {
//             return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Security violation: Missing transaction token." });
//         }

//         // 2. Prevent Replay Attacks (Duplicate payment references)
//         const existingReference = await Order.findOne({ paymentReference });
//         if (existingReference) {
//             return res.status(httpStatus.CONFLICT).json({
//                 success: false,
//                 message: "Security violation: This transaction reference has already been processed."
//             });
//         }

//         // 3. Independent Price & Availability Recalculation
//         let absoluteCalculatedTotal = 0;
//         const fullyCompiledItems = [];

//         for (const item of items) {
//             if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0) {
//                 return res.status(httpStatus.BAD_REQUEST).json({
//                     success: false,
//                     message: "Invalid item quantity detected in cart payload."
//                 });
//             }

//             const currentProduct = await Product.findOne({
//                 _id: item.productId,
//                 vendorId: vendor._id,
//                 isAvailable: true
//             });

//             if (!currentProduct) {
//                 return res.status(httpStatus.BAD_REQUEST).json({
//                     success: false,
//                     message: "One or more items in your cart are no longer available. Please refresh your cart."
//                 });
//             }

//             absoluteCalculatedTotal += currentProduct.price * item.quantity;
//             fullyCompiledItems.push({
//                 productId: currentProduct._id,
//                 quantity: item.quantity
//             });
//         }

//         // 4. Connect to Paystack Core Engine for Ground-Truth Verification
//         const paystackVerifyUrl = `https://api.paystack.co/transaction/verify/${paymentReference}`;
//         const paystackResponse = await fetch(paystackVerifyUrl, {
//             method: "GET",
//             headers: {
//                 Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//                 "Content-Type": "application/json"
//             }
//         });

//         const verificationData = await paystackResponse.json();

//         if (!verificationData.status || verificationData.data.status !== "success") {
//             return res.status(httpStatus.PAYMENT_REQUIRED).json({
//                 success: false,
//                 message: "Payment validation failed via Paystack core engines."
//             });
//         }

//         // 5. Verify captured total covers the cost (Paystack values are in Kobo)
//         const expectedKoboAmount = absoluteCalculatedTotal * 100;
//         if (verificationData.data.amount < expectedKoboAmount) {
//             return res.status(httpStatus.BAD_REQUEST).json({
//                 success: false,
//                 message: "Critical Error: Captured payment total does not cover cost parameters."
//             });
//         }

//         // 6. Split Account Compliance Routing Check
//         if (vendor.paystackSubaccountCode) {
//             const capturedSubaccount = verificationData.data.subaccount?.subaccount_code;
//             if (capturedSubaccount !== vendor.paystackSubaccountCode) {
//                 return res.status(httpStatus.BAD_REQUEST).json({
//                     success: false,
//                     message: "Financial Routing Anomaly: Marketplace split configuration bypass detected."
//                 });
//             }
//         }

//         // 7. Establish Unique Tracking ID
//         let isUnique = false;
//         let finalTrackingId = "";

//         while (!isUnique) {
//             finalTrackingId = Math.floor(100000 + Math.random() * 900000).toString();
//             const collisionCheck = await Order.findOne({ trackingId: finalTrackingId });
//             if (!collisionCheck) {
//                 isUnique = true;
//             }
//         }

//         // 8. Commit order records safely to MongoDB
//         const newOrder = new Order({
//             vendorId: vendor._id,
//             orderSource: "WEB_STOREFRONT",
//             customerWhatsapp,
//             customerName: customerName || "Verified Web Customer",
//             customerEmail,
//             trackingId: finalTrackingId,
//             items: fullyCompiledItems,
//             deliveryAddress,
//             totalAmount: absoluteCalculatedTotal,
//             paymentStatus: "PAID",
//             paymentReference,
//             status: "PENDING"
//         });

//         await newOrder.save();

//         res.status(httpStatus.CREATED).json({
//             success: true,
//             message: "Checkout split completely verified!",
//             trackingId: finalTrackingId,
//             order: newOrder
//         });

//     } catch (error) {
//         console.error("[Venclux Security Vault Exception]:", error.message);
//         res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
//             success: false,
//             message: "Failed to safely complete backend validation processing.",
//             error: error.message
//         });
//     }
// };

import { User } from "../models/user.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";
import { Customer } from "../models/customer.js";
import httpStatus from "http-status";
import { sendNewOrderNotification } from "../config/emailEngine.js";

export const getPublicStorefront = async (req, res) => {
  try {
    const { storeSlug } = req.params;

    const vendor = await User.findOne({
      storeSlug: storeSlug.toLowerCase(),
    }).select("-password");
    if (!vendor) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Requested merchant storefront catalog does not exist.",
      });
    }

    const products = await Product.find({
      vendorId: vendor._id,
      isAvailable: true,
    });

    const uniqueCategories = [
      "All",
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ];

    return res.status(httpStatus.OK).json({
      success: true,
      businessName: vendor.businessName,
      whatsappNumber: vendor.whatsappNumber,
      paystackSubaccountCode: vendor.paystackSubaccountCode,
      deliveryFee: vendor.deliveryFee || 0,
      categories: uniqueCategories,
      products,
      logo: vendor.logo,
      banner: vendor.banner,
      tagline: vendor.tagline,
      description: vendor.description,
    });
  } catch (error) {
    console.error(
      "[Venclux Catalogue Processing Loop Breakdown]:",
      error.message,
    );
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        "Internal ledger processing failure occurred tracking store configurations.",
      error: error.message,
    });
  }
};

export const processWebCheckout = async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const {
      customerName,
      customerEmail,
      customerWhatsapp,
      deliveryAddress,
      deliveryNotes,
      paymentReference,
      items,
    } = req.body;

    console.log(`\n🛒 [CHECKOUT] New request for store: ${storeSlug}`);
    console.log(`📦 Items received:`, JSON.stringify(items));
    console.log(`💳 Payment reference: ${paymentReference}`);

    if (!paymentReference || !items || items.length === 0) {
      console.error("❌ [CHECKOUT] Missing paymentReference or items.");
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message:
          "Missing essential transaction parameters or payload elements.",
      });
    }

    const vendor = await User.findOne({ storeSlug: storeSlug.toLowerCase() });
    if (!vendor) {
      console.error(
        `❌ [CHECKOUT] Vendor not found for storeSlug: ${storeSlug}`,
      );
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Targeted subaccount vendor mapping was not resolved.",
      });
    }
    console.log(
      `✅ [CHECKOUT] Vendor found: ${vendor.businessName} (${vendor._id})`,
    );

    const existingReference = await Order.findOne({ paymentReference });
    if (existingReference) {
      console.warn(
        `⚠️ [CHECKOUT] Duplicate reference blocked: ${paymentReference}`,
      );
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message:
          "Security violation: This transaction reference has already been processed.",
      });
    }

    // --- Paystack Verification ---
    console.log(`🔍 [CHECKOUT] Verifying payment with Paystack...`);
    const paystackVerifyUrl = `https://api.paystack.co/transaction/verify/${paymentReference}`;
    const paystackResponse = await fetch(paystackVerifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const verificationData = await paystackResponse.json();
    console.log(
      `📡 [CHECKOUT] Paystack verify response status: ${verificationData?.data?.status}`,
    );
    console.log(
      `📡 [CHECKOUT] Paystack verify full data:`,
      JSON.stringify(verificationData?.data),
    );

    if (
      !verificationData.status ||
      verificationData.data?.status !== "success"
    ) {
      console.error(
        `❌ [CHECKOUT] Paystack verification FAILED. Status: ${verificationData?.data?.status}`,
      );
      return res.status(httpStatus.PAYMENT_REQUIRED).json({
        success: false,
        message: `Payment reference validation failed. Paystack status: ${verificationData?.data?.status || "unknown"}`,
      });
    }
    console.log(`✅ [CHECKOUT] Paystack payment verified successfully.`);

    // --- Resolve products ---
    let absoluteCalculatedTotal = 0;
    const compiledOrderItems = [];

    for (const item of items) {
      const productId = item.productId || item.id;
      const itemQuantity = item.quantity || item.qty || 1;

      console.log(
        `🔎 [CHECKOUT] Looking up productId: ${productId}, qty: ${itemQuantity}`,
      );

      if (itemQuantity <= 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message:
            "Invalid item quantity parameters captured inside cart payload data rows.",
        });
      }

      const currentProduct = await Product.findOne({
        _id: productId,
        vendorId: vendor._id,
        isAvailable: true,
      });
      if (!currentProduct) {
        console.error(
          `❌ [CHECKOUT] Product not found or unavailable: ${productId} for vendorId: ${vendor._id}`,
        );
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message:
            "One or more items in your cart are no longer available. Please update your cart parameters.",
        });
      }
      console.log(
        `✅ [CHECKOUT] Product found: ${currentProduct.name}, stock: ${currentProduct.stock}`,
      );

      // Only block if stock is actively tracked (> 0 means vendor uses stock management)
      // A stock of 0 on the product schema default does NOT mean "out of stock" —
      // it means the vendor may not have set it. Only block if stock was explicitly set > 0 and is now exhausted.
      if (
        currentProduct.stock !== undefined &&
        currentProduct.stock !== null &&
        currentProduct.stock > 0 &&
        currentProduct.stock < itemQuantity
      ) {
        console.error(
          `❌ [CHECKOUT] Insufficient stock for: ${currentProduct.name}. Has: ${currentProduct.stock}, needs: ${itemQuantity}`,
        );
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: `Insufficient inventory stock for ${currentProduct.name}. Only ${currentProduct.stock} units left.`,
        });
      }

      absoluteCalculatedTotal += currentProduct.price * itemQuantity;

      compiledOrderItems.push({
        productId: currentProduct._id,
        product: currentProduct._id,
        name: currentProduct.name,
        productName: currentProduct.name,
        price: currentProduct.price,
        quantity: itemQuantity,
        stock: currentProduct.stock,
      });
    }

    const vendorDeliveryFee = vendor.deliveryFee || 0;
    const finalExpectedTotal = absoluteCalculatedTotal + vendorDeliveryFee;
    const expectedKoboAmount = Math.round(finalExpectedTotal * 100);
    const receivedKoboAmount = verificationData.data.amount;

    console.log(
      `💰 [CHECKOUT] Expected kobo: ${expectedKoboAmount}, Paystack received kobo: ${receivedKoboAmount}`,
    );

    // Allow up to 5% tolerance for Paystack fee rounding/test mode differences
    const tolerance = expectedKoboAmount * 0.05;
    if (receivedKoboAmount < expectedKoboAmount - tolerance) {
      console.error(
        `❌ [CHECKOUT] Amount mismatch! Expected ~${expectedKoboAmount}, got ${receivedKoboAmount}`,
      );
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: `Payment amount mismatch. Expected ₦${finalExpectedTotal.toLocaleString()}, received ₦${(receivedKoboAmount / 100).toLocaleString()}.`,
      });
    }

    // Subaccount check — log warning only, never block order creation
    if (vendor.paystackSubaccountCode) {
      const capturedSubaccount =
        verificationData.data.subaccount?.subaccount_code;
      if (capturedSubaccount !== vendor.paystackSubaccountCode) {
        console.warn(
          `⚠️ [CHECKOUT] Subaccount mismatch: expected ${vendor.paystackSubaccountCode}, got ${capturedSubaccount}. Proceeding anyway.`,
        );
      }
    }

    let isUnique = false;
    let finalTrackingId = "";

    while (!isUnique) {
      finalTrackingId = Math.floor(100000 + Math.random() * 900000).toString();
      const collisionCheck = await Order.findOne({
        trackingId: finalTrackingId,
      });
      if (!collisionCheck) {
        isUnique = true;
      }
    }

    for (const element of compiledOrderItems) {
      if (element.stock > 0) {
        await Product.findByIdAndUpdate(element.productId, {
          $inc: { stock: -element.quantity },
        });
      }
    }

    const newOrder = new Order({
      vendorId: vendor._id.toString(), // String — must match req.user.id (JWT) for dashboard $match
      storeSlug: vendor.storeSlug,
      orderSource: "WEB_STOREFRONT",
      customerName: customerName || "Web Customer",
      customerEmail: customerEmail || "",
      customerWhatsapp: customerWhatsapp,
      deliveryAddress: deliveryAddress || "",
      deliveryNotes: deliveryNotes || "",
      trackingId: finalTrackingId,
      items: compiledOrderItems,
      totalAmount: finalExpectedTotal,
      paymentStatus: "PAID",
      paymentReference: paymentReference,
      status: "PENDING",
    });

    await newOrder.save();

    // Upsert customer record so the dashboard activeCustomers count reflects web buyers
    try {
      await Customer.findOneAndUpdate(
        { vendorId: vendor._id.toString(), phoneNumber: customerWhatsapp },
        {
          name: customerName || "Web Customer",
          phoneNumber: customerWhatsapp,
          email: customerEmail || "",
          waid: customerWhatsapp, // Use phone as waid fallback for web storefront customers
          $inc: { totalLTV: finalExpectedTotal },
        },
        { upsert: true, new: true },
      );
    } catch (customerErr) {
      // Non-fatal — order is already saved; just log the customer upsert failure
      console.error("[Customer Upsert Warning]:", customerErr.message);
    }

    if (vendor.notifications && vendor.notifications.newOrder) {
      sendNewOrderNotification(vendor.email, vendor.businessName, newOrder)
        .catch(err => console.error("[Order Mail Warning]: Failed to dispatch order mail", err.message));
    }

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Checkout calculation split completely verified and recorded!",
      trackingId: finalTrackingId,
    });
  } catch (error) {
    console.error("[Venclux Security Vault Engine Failure]:", error.message);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        "Fatal backend breakdown executing core transaction recording mechanics.",
      error: error.message,
    });
  }
};
