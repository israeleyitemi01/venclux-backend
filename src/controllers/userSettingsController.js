import httpStatus from "http-status";
import { User } from "../models/user.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";
import { sendNotificationSettingsUpdateMail } from "../config/emailEngine.js";

// @desc    Retrieve complete current active profile & preferences data object
// @route   GET /api/user/settings
export const getSettings = async (req, res) => {
    try {
        // req.user is already safely populated by your authMiddleware
        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            data: req.user
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to gather profile configuration parameters",
            error: error.message
        });
    }
};

// @desc    Update identity name alignment, store routing path, and regional properties
// @route   PUT /api/user/settings/store
export const updateStoreSettings = async (req, res) => {
    const { storeName, storeSlug, currency, language, timezone, country } = req.body;
    
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                statusCode: httpStatus.NOT_FOUND,
                message: "User context matching token missing"
            });
        }

        // Enforce store routing path string uniqueness rules across database entries
        if (storeSlug && storeSlug !== user.storeSlug) {
            const slugCollision = await User.findOne({ storeSlug });
            if (slugCollision) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    statusCode: httpStatus.BAD_REQUEST,
                    message: "The requested store routing URL parameter is already claimed."
                });
            }
            user.storeSlug = storeSlug;
        }

        // Map updates cleanly (businessName updates store identity parameters smoothly)
        if (storeName) user.businessName = storeName;
        if (currency) user.currency = currency;
        if (language) user.language = language;
        if (timezone) user.timezone = timezone;
        if (country) user.country = country;

        await user.save();

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Identity settings synced completely!",
            data: user
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to apply profile changes",
            error: error.message
        });
    }
};

// @desc    Overhaul current nested notice flags within user schema fields
// @route   PUT /api/user/settings/notifications
export const updateNotificationSettings = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { notifications: req.body } },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(httpStatus.NOT_FOUND).json({
                statusCode: httpStatus.NOT_FOUND,
                message: "User context matching token missing"
            });
        }

        // Send email notification dynamically
        sendNotificationSettingsUpdateMail(updatedUser.email, updatedUser.businessName)
            .catch(err => console.error("Failed to send notification settings email", err));

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Notification configurations successfully updated!",
            data: updatedUser.notifications
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to persist updated alert parameters",
            error: error.message
        });
    }
};

// @desc    Clear unread notifications count
// @route   PUT /api/vendor/settings/notifications/clear
export const clearNotifications = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { unreadNotifications: 0 } },
            { new: true }
        ).select("-password");

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Notifications cleared",
            data: updatedUser.unreadNotifications
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to clear notifications",
            error: error.message
        });
    }
};

// @desc    Retrieve dynamic usage telemetry and subscription metrics for billing dashboards
// @route   GET /api/vendor/settings/billing
export const getBillingMetrics = async (req, res) => {
    try {
        const vendorId = req.user._id;

        // 1. Calculate real total product counts owned by this specific vendor account
        const totalProductsCreated = await Product.countDocuments({ vendorId });

        // 2. Aggregate gross order income calculations from successfully PAID store orders
        const revenueAggregation = await Order.aggregate([
            { 
                $match: { 
                    vendorId: vendorId.toString(), 
                    paymentStatus: "PAID" 
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: "$totalAmount" } 
                } 
            }
        ]);

        const grossRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

        // 3. Construct billing metadata using fields added to your updated User model
        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            data: {
                subscription: req.user.subscription || {
                    plan: "Free",
                    status: "Active",
                    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                usage: {
                    productsCount: totalProductsCreated,
                    productsLimit: req.user.subscription?.plan === "Pro" ? Infinity : 7, // ─── UPDATED: Free tier max cap lowered to 7 ───
                    revenueTracked: grossRevenue
                }
            }
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to gather real billing lifecycle parameters",
            error: error.message
        });
    }
};

// @desc    Upload profile picture to Cloudinary and update User
// @route   PUT /api/vendor/settings/profile-picture
export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(httpStatus.BAD_REQUEST).json({
                statusCode: httpStatus.BAD_REQUEST,
                message: "No profile picture file uploaded."
            });
        }
        const profilePicUrl = req.file.path;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture: profilePicUrl },
            { new: true }
        ).select("-password");

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Profile picture updated successfully!",
            data: updatedUser
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to upload profile picture.",
            error: error.message
        });
    }
};

// @desc    Update basic profile settings
// @route   PUT /api/vendor/settings/profile
export const updateProfileSettings = async (req, res) => {
    try {
        // We use name to map to the first/last name, and whatsappNumber for phone
        const { firstName, lastName, phone } = req.body;
        
        const updateData = {};
        if (firstName || lastName) {
            updateData.name = `${firstName || ''} ${lastName || ''}`.trim();
        }
        if (phone) {
            updateData.whatsappNumber = phone;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Profile settings updated successfully!",
            data: updatedUser
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to update profile settings.",
            error: error.message
        });
    }
};

// @desc    Delete the user account completely
// @route   DELETE /api/vendor/settings/account
export const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                statusCode: httpStatus.NOT_FOUND,
                message: "User not found."
            });
        }

        // Delete all products for this vendor
        await Product.deleteMany({ vendorId: req.user._id });
        // Delete all orders for this vendor
        await Order.deleteMany({ vendorId: req.user._id });

        // Delete the user
        await User.findByIdAndDelete(req.user._id);

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Account deleted successfully."
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: "Failed to delete account.",
            error: error.message
        });
    }
};