import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import whatsappWebhook from "./routes/whatsappWebhook.js";
import orderRoutes from "./routes/orderRoutes.js";
import publicStoreRoutes from "./routes/publicStoreRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

dotenv.config();

const app = express();

// --- SECURE CORS AND NETWORK INTEGRATION ---
const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173",
  "https://venclux.site",                       // official production apex domain
  "https://www.venclux.site",                   // official production www subdomain
  "https://venclux-frontend-dkm9.vercel.app"    // deployment fallback domain
];

// DYNAMICALLY INJECT PRODUCTION VERCEL URL IF IT EXISTS IN .ENV
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Always allow the origin (dynamic reflection for any domain)
    callback(null, true);
  },
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"] 
}));

// Standard body-parsing middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Inbound Messaging Hooks (Keep this above generic route prefixes)
app.use(whatsappWebhook);

// Api Routes mounting
app.use("/api/storefront", publicStoreRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
    res.send("Welcome to the Venclux backend API. Transforming WhatsApp Commerce!");
});

const PORT = process.env.PORT || 5010;

// Connect to MongoDB and start the server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Venclux server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error starting the server:", error);
        process.exit(1);
    }
};

startServer();