import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { Customer } from "../models/customer.js";

export const getAnalyticsSummary = async (req, res) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({ success: false, message: "Unauthorized access token payload missing." });
    }

    const vendorId = req.user.id || req.user._id;
    const storeSlug = req.user.storeSlug || req.user.slug;
    const { range } = req.query; // Expecting "Last 7 Days", "Last 30 Days", or "Last 90 Days"

    // Construct core multi-tenant match identity matrix
    const orderMatch = storeSlug
      ? { $or: [{ vendorId: vendorId.toString() }, { storeSlug: storeSlug }] }
      : { vendorId: vendorId.toString() };

    // Establish dynamic date window lookbacks
    let daysToLookback = 7;
    if (range === "Last 30 Days") daysToLookback = 30;
    if (range === "Last 90 Days") daysToLookback = 90;

    const now = new Date();
    
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(now.getDate() - daysToLookback);
    currentPeriodStart.setHours(0, 0, 0, 0);

    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(now.getDate() - (daysToLookback * 2));
    previousPeriodStart.setHours(0, 0, 0, 0);

    // --- 1. CORE KPI PERFORMANCE PIPELINES (CURRENT VS PREVIOUS) ---
    const fetchPeriodMetrics = async (startDate, endDate) => {
      const matchConditions = { ...orderMatch, createdAt: { $gte: startDate } };
      if (endDate) matchConditions.createdAt.$lt = endDate;

      const data = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: "$paymentStatus" }, ["PAID", "SUCCESS", "SUCCESSFUL"]] },
                  "$totalAmount",
                  0
                ]
              }
            },
            ordersCount: { $sum: 1 },
            paidOrdersCount: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: "$paymentStatus" }, ["PAID", "SUCCESS", "SUCCESSFUL"]] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      return data[0] || { revenue: 0, ordersCount: 0, paidOrdersCount: 0 };
    };

    const [currentMetrics, previousMetrics] = await Promise.all([
      fetchPeriodMetrics(currentPeriodStart, null),
      fetchPeriodMetrics(previousPeriodStart, currentPeriodStart)
    ]);

    // Track active customers added within this specific time boundary
    const currentCustomerCount = await Customer.countDocuments({
      vendorId,
      createdAt: { $gte: currentPeriodStart }
    });
    const previousCustomerCount = await Customer.countDocuments({
      vendorId,
      createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }
    });

    // Safe mathematical growth parsing handler
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const revenueTrend = calculateTrend(currentMetrics.revenue, previousMetrics.revenue);
    const ordersTrend = calculateTrend(currentMetrics.ordersCount, previousMetrics.ordersCount);
    const customersTrend = calculateTrend(currentCustomerCount, previousCustomerCount);

    // Calculate Conversion/Avg Order Metrics safely
    const currentConvRate = currentMetrics.ordersCount > 0 
      ? Number(((currentMetrics.paidOrdersCount / currentMetrics.ordersCount) * 100).toFixed(1)) 
      : 0;
    const previousConvRate = previousMetrics.ordersCount > 0 
      ? Number(((previousMetrics.paidOrdersCount / previousMetrics.ordersCount) * 100).toFixed(1)) 
      : 0;
    const conversionTrend = Number((currentConvRate - previousConvRate).toFixed(1));

    // --- 2. REVENUE OVER TIME TRACKING MATRIX ---
    const ordersInWindow = await Order.find({
      ...orderMatch,
      createdAt: { $gte: currentPeriodStart }
    }).select("createdAt totalAmount paymentStatus items").lean();

    const revenueMap = {};
    const dayOfWeekMap = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    // Build adaptive structural intervals for charts
    for (let i = daysToLookback - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "May 15"
      revenueMap[label] = 0;
    }

    // Process local elements into metrics map
    ordersInWindow.forEach(order => {
      const isPaid = ["PAID", "SUCCESS", "SUCCESSFUL"].includes((order.paymentStatus || "").toUpperCase());
      const orderDate = new Date(order.createdAt);
      
      if (isPaid) {
        const dateLabel = orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (revenueMap[dateLabel] !== undefined) {
          revenueMap[dateLabel] += Number(order.totalAmount || 0);
        }
      }

      // Track order frequency mapping irrespective of status to evaluate operational pressure
      const dayLabel = orderDate.toLocaleDateString("en-US", { weekday: "short" });
      if (dayOfWeekMap[dayLabel] !== undefined) {
        dayOfWeekMap[dayLabel] += 1;
      }
    });

    const finalRevenueTimeline = Object.keys(revenueMap).map(key => ({
      date: key,
      value: revenueMap[key]
    }));

    const daysOrderedList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const finalOrdersPerDay = daysOrderedList.map(day => ({
      day,
      orders: dayOfWeekMap[day] || 0
    }));

    // --- 3. DYNAMIC INVENTORY & CATEGORY REVENUE EXTRACTOR ---
    const productIdsInOrders = [];
    ordersInWindow.forEach(o => o.items?.forEach(i => i.productId && productIdsInOrders.push(i.productId)));
    
    const productsDetails = await Product.find({ _id: { $in: productIdsInOrders } }).select("category").lean();
    const productCategoryMap = {};
    productsDetails.forEach(p => { productCategoryMap[p._id.toString()] = p.category || "Other"; });

    const categoryRevenueMap = {};
    const topProductsMap = {};

    ordersInWindow.forEach(order => {
      const isPaid = ["PAID", "SUCCESS", "SUCCESSFUL"].includes((order.paymentStatus || "").toUpperCase());
      if (!isPaid || !order.items) return;

      order.items.forEach(item => {
        const pId = item.productId?.toString();
        const categoryName = productCategoryMap[pId] || "Other";
        const lineRevenue = Number((item.price || 0) * (item.quantity || 1));

        categoryRevenueMap[categoryName] = (categoryRevenueMap[categoryName] || 0) + lineRevenue;

        const pName = item.name || item.productName || "Store Item";
        if (!topProductsMap[pName]) {
          topProductsMap[pName] = { name: pName, revenue: 0 };
        }
        topProductsMap[pName].revenue += lineRevenue;
      });
    });

    // Format Category Shares
    const totalCategoryRevenue = Object.values(categoryRevenueMap).reduce((a, b) => a + b, 0) || 1;
    const categoryColors = ["#10B981", "#F59E0B", "#0F172A", "#CBD5E1", "#6366F1"];
    const finalCategoryData = Object.keys(categoryRevenueMap).map((cat, idx) => ({
      name: cat,
      value: Math.round((categoryRevenueMap[cat] / totalCategoryRevenue) * 100),
      color: categoryColors[idx % categoryColors.length]
    })).sort((a,b) => b.value - a.value);

    // Format Top Products Custom Velocity
    const sortedProductsArray = Object.values(topProductsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const maxProductRevenue = sortedProductsArray[0]?.revenue || 1;
    const finalTopProducts = sortedProductsArray.map(p => ({
      name: p.name,
      revenue: p.revenue,
      bar: Math.round((p.revenue / maxProductRevenue) * 100)
    }));

    return res.status(200).json({
      success: true,
      data: {
        cards: {
          revenue: currentMetrics.revenue,
          revenueTrend,
          orders: currentMetrics.ordersCount,
          ordersTrend,
          customers: currentCustomerCount,
          customersTrend,
          conversionRate: currentConvRate,
          conversionTrend
        },
        revenueTimeline: finalRevenueTimeline,
        categoryData: finalCategoryData.length > 0 ? finalCategoryData : [{ name: "No Sales", value: 100, color: "#CBD5E1" }],
        ordersPerDay: finalOrdersPerDay,
        topProducts: finalTopProducts
      }
    });

  } catch (error) {
    console.error("Critical Exception in Analytics Core Engine:", error);
    return res.status(500).json({ success: false, message: "Internal server error gathering analytics datasets." });
  }
};