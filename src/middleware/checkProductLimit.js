import httpStatus from "http-status";
import { Product } from "../models/product.js";

export const checkProductLimit = async (req, res, next) => {
    try {
        const vendorId = req.user._id;
        const isPro = req.user.subscription?.plan === "Pro";

        if (isPro) {
            return next(); // Pro accounts have infinite listing rights
        }

        // Count current catalog entries owned by this vendor
        const currentProductCount = await Product.countDocuments({ vendorId });

        if (currentProductCount >= 7) {
            return res.status(httpStatus.FORBIDDEN).json({
                statusCode: httpStatus.FORBIDDEN,
                message: "Maximum capacity reached. Free tier accounts are restricted to 7 active product listings. Upgrade to Pro to bypass limitations."
            });
        }

        next();
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to validate account tier allocation thresholds.",
            error: error.message
        });
    }
};