// import { Order } from "../models/order.js";
// import { Product } from "../models/product.js";
// import { Customer } from "../models/customer.js";

// export const getDashboardSummary = async (req, res) => {
//   try {
//     const vendorId = req.user.id; // Extracted safely from your JWT Verify Auth Middleware

//     // 1. Calculate Aggregated Metric Cards Data
//     const metricsPromise = Order.aggregate([
//       { $match: { vendorId: vendorId } },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: {
//             $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$totalAmount", 0] }
//           },
//           totalOrders: { $sum: 1 },
//           pendingOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Pending"] }, 1, 0] } },
//           paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } }
//         }
//       }
//     ]);

//     // 2. Count Unique Customers for this Vendor Storefront
//     const customerCountPromise = Customer.countDocuments({ vendorId });

//     // 3. Fetch Last 4 Transacted Orders (Recent Orders List)
//     const recentOrdersPromise = Order.find({ vendorId })
//       .sort({ createdAt: -1 })
//       .limit(4)
//       .select("id customerName totalAmount orderStatus paymentStatus createdAt");

//     // 4. Extract Sales Analytics Area Chart Dataset (Grouped by Last 7 Days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const salesChartPromise = Order.aggregate([
//       {
//         $match: {
//           vendorId: vendorId,
//           paymentStatus: "Paid",
//           createdAt: { $gte: sevenDaysAgo }
//         }
//       },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%a", date: "$createdAt" } }, // E.g., "Mon", "Tue"
//           revenue: { $sum: "$totalAmount" },
//           sortDate: { $min: "$createdAt" }
//         }
//       },
//       { $sort: { sortDate: 1 } }
//     ]);

//     // 5. Query Best Selling Top Products
//     const topProductsPromise = Order.aggregate([
//       { $match: { vendorId: vendorId, paymentStatus: "Paid" } },
//       { $unwind: "$items" },
//       {
//         $group: {
//           _id: "$items.productId",
//           name: { $first: "$items.productName" },
//           totalSold: { $sum: "$items.quantity" },
//           totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
//         }
//       },
//       { $sort: { totalSold: -1 } },
//       { $limit: 4 }
//     ]);

//     // Resolve all multi-tenant calculations concurrently for maximum scale speeds
//     const [metrics, customerCount, recentOrders, salesChart, topProducts] = await Promise.all([
//       metricsPromise,
//       customerCountPromise,
//       recentOrdersPromise,
//       salesChartPromise,
//       topProductsPromise
//     ]);

//     const activeMetrics = metrics[0] || { totalRevenue: 0, totalOrders: 0, pendingOrders: 0, paidOrders: 0 };

//     return res.status(200).json({
//       success: true,
//       data: {
//         cards: {
//           totalRevenue: activeMetrics.totalRevenue,
//           totalOrders: activeMetrics.totalOrders,
//           pendingOrders: activeMetrics.pendingOrders,
//           paidOrders: activeMetrics.paidOrders,
//           activeCustomers: customerCount
//         },
//         salesData: salesChart.map(item => ({ day: item._id, revenue: item.revenue })),
//         recentOrders: recentOrders.map(order => ({
//           id: `#VX-${order._id.toString().slice(-4).toUpperCase()}`,
//           customer: order.customerName,
//           amount: `₦${order.totalAmount.toLocaleString()}`,
//           status: order.orderStatus,
//           statusColor: order.orderStatus === "Pending" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
//         })),
//         topProducts: topProducts.map(prod => ({
//           id: prod._id,
//           name: prod.name,
//           sold: `${prod.totalSold} sold`,
//           price: `₦${prod.totalRevenue.toLocaleString()}`
//         }))
//       }
//     });

//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Multi-tenant engine failure preparing analytics summaries." });
//   }
// };

import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { Customer } from "../models/customer.js";

export const getDashboardSummary = async (req, res) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      console.error(
        "Dashboard Error: Unauthorized access attempt - No user payload found on request.",
      );
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized access token verification mapping missing.",
        });
    }

    const vendorId = req.user.id || req.user._id;
    const storeSlug = req.user.storeSlug || req.user.slug;

    const orderMatch = storeSlug
      ? { $or: [{ vendorId: vendorId.toString() }, { storeSlug: storeSlug }] }
      : { vendorId: vendorId.toString() };

    console.log(
      `[Venclux Data Engine] Processing metrics summary for identity node: ${vendorId}`,
    );

    // 1. Calculate Metric Cards Data (STRICT PAYMENT CHECK)
    const metricsPromise = Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toUpper: "$paymentStatus" },
                    ["PAID", "SUCCESS", "SUCCESSFUL"],
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toUpper: { $ifNull: ["$status", "$orderStatus"] } },
                    ["PENDING", "PROCESSING"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          paidOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toUpper: "$paymentStatus" },
                    ["PAID", "SUCCESS", "SUCCESSFUL"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).catch((err) => {
      console.error("Aggregation Error in Metrics:", err);
      return [];
    });

    // 2. Count Unique Customers
    const customerCountPromise = Customer.countDocuments({ vendorId }).catch(
      (err) => {
        console.error("Error counting customers:", err);
        return 0;
      },
    );

    // 3. Fetch Last 4 Transacted Orders
    const recentOrdersPromise = Order.find(orderMatch)
      .sort({ createdAt: -1 })
      .limit(4)
      .select(
        "status orderStatus paymentStatus totalAmount customerName createdAt trackingId customerWhatsapp",
      )
      .catch((err) => {
        console.error("Error fetching recent orders:", err);
        return [];
      });

    // 5. Query Best Selling Top Products
    const topProductsPromise = Order.aggregate([
      { $match: orderMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: {
            $first: {
              $ifNull: ["$items.name", "$items.productName", "Store Product"],
            },
          },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.price", "$totalAmount", 0] },
                "$items.quantity",
              ],
            },
          },
        },
      },
    ]).sort({ totalSold: -1 }).limit(4).catch((err) => {
      console.error("Aggregation Error in Top Products:", err);
      return [];
    });

    // Execute promises 1, 2, 3, and 5 in parallel
    const [metrics, customerCount, recentOrders, topProducts] =
      await Promise.all([
        metricsPromise,
        customerCountPromise,
        recentOrdersPromise,
        topProductsPromise,
      ]);

    const activeMetrics =
      metrics && metrics[0]
        ? metrics[0]
        : { totalRevenue: 0, totalOrders: 0, pendingOrders: 0, paidOrders: 0 };

    // 4. Extract Sales Analytics Chart Dataset (CRASH-PROOF JAVASCRIPT LOOKUP ENGINE)
    const chartWindowStart = new Date();
    chartWindowStart.setDate(chartWindowStart.getDate() - 7); 
    chartWindowStart.setHours(0, 0, 0, 0); 

    const rawChartOrders = await Order.find({
      ...orderMatch,
      createdAt: { $gte: chartWindowStart }
    }).select("createdAt totalAmount paymentStatus").lean();

    // --- CALENDAR FILL MATRIX ENGINE ---
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDayIndex = new Date().getDay();

    const chronologicalDays = [];
    for (let i = 6; i >= 0; i--) {
      const index = (currentDayIndex - i + 7) % 7;
      chronologicalDays.push(daysOfWeek[index]);
    }

    // Initialize all daily map tracking nodes to 0
    const dbSalesMap = {};
    chronologicalDays.forEach(day => { dbSalesMap[day] = 0; });

    // Iterate over matching transactions to assemble dynamic daily performance aggregates
    if (rawChartOrders && rawChartOrders.length > 0) {
      rawChartOrders.forEach(order => {
        const status = (order.paymentStatus || "").toUpperCase();
        if (["PAID", "SUCCESS", "SUCCESSFUL"].includes(status)) {
          const orderDay = new Date(order.createdAt).toLocaleDateString("en-US", { weekday: "short" });
          if (dbSalesMap[orderDay] !== undefined) {
            dbSalesMap[orderDay] += Number(order.totalAmount || 0);
          }
        }
      });
    }

    const finalChartDataset = chronologicalDays.map((dayName) => ({
      day: dayName,
      revenue: dbSalesMap[dayName] || 0
    }));

    // --- GENERATE REALTIME COMPONENT FEED ---
    const initialsColors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
    ];
    const realTimeActivity = (recentOrders || []).map((order, index) => {
      const name = order.customerName || "Customer";
      const tracking = order.trackingId || "Order";
      const initial = name.charAt(0).toUpperCase();
      const color = initialsColors[index % initialsColors.length];

      let timeText = "Just now";
      if (order.createdAt) {
        const diffMins = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
        if (diffMins > 0)
          timeText = diffMins < 60 ? `${diffMins} mins ago` : `${Math.floor(diffMins / 60)} hours ago`;
      }

      return {
        id: order._id,
        initial,
        color,
        text: `${name} placed an order (#${tracking}) worth ₦${(order.totalAmount || 0).toLocaleString()}`,
        time: timeText,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        cards: {
          totalRevenue: activeMetrics.totalRevenue || 0,
          totalOrders: activeMetrics.totalOrders || 0,
          pendingOrders: activeMetrics.pendingOrders || 0,
          paidOrders: activeMetrics.paidOrders || 0,
          activeCustomers: customerCount || 0,
        },
        salesData: finalChartDataset,
        recentOrders: (recentOrders || []).map((order) => {
          const rawStatus = order.status || "PENDING";
          const capitalizedStatus = rawStatus.toUpperCase();
          const displayId = order.trackingId
            ? `#${order.trackingId}`
            : `#VX-${order._id.toString().slice(-4).toUpperCase()}`;
          return {
            id: displayId,
            customer: order.customerName || "Unknown Customer",
            amount: `₦${(order.totalAmount || 0).toLocaleString()}`,
            status: capitalizedStatus,
            statusColor: capitalizedStatus === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
          };
        }),
        realTimeActivity,
        topProducts: (topProducts || []).map((prod) => ({
          id: prod._id,
          name: prod.name || "Unnamed Product",
          sold: `${prod.totalSold || 0} sold`,
          price: `₦${(prod.totalRevenue || 0).toLocaleString()}`,
        })),
      },
    });
  } catch (error) {
    console.error("Critical System Exception in Dashboard Summary Engine:", error);
    return res.status(500).json({
      success: false,
      message: "Multi-tenant engine failure preparing analytics summaries.",
      error: error.message,
    });
  }
};