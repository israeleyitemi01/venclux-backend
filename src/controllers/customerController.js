import { Customer } from "../models/customer.js";
import { Order } from "../models/order.js";

export const getVendorCustomers = async (req, res) => {
  try {
    const vendorId = req.user.id || req.user._id;
    if (!vendorId) {
      return res.status(401).json({ success: false, message: "Unauthorized access node." });
    }

    // 1. Fetch all baseline customers belonging to this vendor
    const customers = await Customer.find({ vendorId: vendorId.toString() }).sort({ updatedAt: -1 });

    // 2. Fetch order telemetry metadata to dynamically map structural states (Spent, order counts, last active)
    const orderAggregates = await Order.aggregate([
      { $match: { vendorId: vendorId.toString() } },
      {
        $group: {
          _id: "$customerWhatsapp", // Group orders by customer phone identifiers
          totalOrders: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: "$paymentStatus" }, ["PAID", "SUCCESS", "SUCCESSFUL"]] },
                "$totalAmount",
                0
              ]
            }
          },
          lastOrderDate: { $max: "$createdAt" }
        }
      }
    ]);

    // Convert aggregation array to a map for instant O(1) loop access
    const statsMap = new Map(orderAggregates.map(item => [item._id, item]));

    // 3. Map database documents to clean frontend objects matching your UI structure
    const mappedCustomers = customers.map(cust => {
      // Look up values using phone fields or waid fallbacks
      const lookupKey = cust.phoneNumber || cust.waid;
      const metrics = statsMap.get(lookupKey) || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };

      // Calculate simplified relative timeframe string for "LAST ORDER" field
      let lastOrderText = "Never";
      let status = "New"; 

      if (metrics.lastOrderDate) {
        const daysAgo = Math.floor((new Date() - new Date(metrics.lastOrderDate)) / (1000 * 60 * 60 * 24));
        if (daysAgo === 0) lastOrderText = "Today";
        else if (daysAgo === 1) lastOrderText = "Yesterday";
        else lastOrderText = `${daysAgo} days ago`;

        // Dynamic status mapping engine criteria
        if (metrics.totalOrders >= 4) status = "Returning";
        if (daysAgo > 30) status = "At Risk";
        else if (daysAgo <= 30 && metrics.totalOrders < 4) status = "Active";
      }

      const rawName = cust.name || "WhatsApp Shopper";
      const initial = rawName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "WS";

      return {
        id: cust._id,
        name: rawName,
        initial,
        email: cust.email || "No email provided",
        phone: cust.phoneNumber ? `+${cust.phoneNumber}` : `+${cust.waid}`,
        orders: metrics.totalOrders,
        spent: `₦${(metrics.totalSpent || cust.totalLTV || 0).toLocaleString()}`,
        lastOrder: lastOrderText,
        status: status // "Active", "New", "Returning", "At Risk"
      };
    });

    // 4. Compute Dynamic Summary Pill Totals
    const counts = {
      ALL: mappedCustomers.length,
      ACTIVE: mappedCustomers.filter(c => c.status === "Active").length,
      NEW: mappedCustomers.filter(c => c.status === "New").length,
      RETURNING: mappedCustomers.filter(c => c.status === "Returning").length,
      AT_RISK: mappedCustomers.filter(c => c.status === "At Risk").length
    };

    return res.status(200).json({
      success: true,
      data: {
        customers: mappedCustomers,
        counts
      }
    });

  } catch (error) {
    console.error("Error gathering vendor customers profile data:", error);
    return res.status(500).json({ success: false, message: "Failed to pull merchant consumer nodes." });
  }
};