import { User } from "../models/user.js";
import httpStatus from "http-status";

/**
 * LINK BANK ACCOUNT AND GENERATE PAYSTACK SUBACCOUNT
 * POST /api/vendor/payout-setup
 * (This route should be protected by your authMiddleware)
 */
export const setupVendorPayout = async (req, res) => {
    try {
        const { business_name, settlement_bank, account_number, percentage_charge } = req.body;
        const vendorId = req.user.id; // Pulled from your authMiddleware token

        // Validate basic inputs
        if (!settlement_bank || !account_number) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Settlement bank and account number are required."
            });
        }

        // 1. Send the banking credentials directly to Paystack's subaccount creation engine
        const paystackResponse = await fetch("https://api.paystack.co/subaccount", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                business_name: business_name || "Venclux Merchant Store",
                settlement_bank: settlement_bank, // Bank Code (e.g., "058" for GTB, "011" for First Bank)
                account_number: account_number,    // 10-digit NUBAN account number
                percentage_charge: percentage_charge || 2.5 // Venclux platform commission percentage!
            })
        });

        const paystackData = await paystackResponse.json();

        if (!paystackData.status) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: `Paystack account verification failed: ${paystackData.message}`
            });
        }

        // 2. Extract the brand-new generated subaccount code from Paystack's response
        const generatedSubaccountCode = paystackData.data.subaccount_code;

        // 3. Persist this unique key inside the vendor's database profile row
        const updatedVendor = await User.findByIdAndUpdate(
            vendorId,
            { paystackSubaccountCode: generatedSubaccountCode },
            { new: true }
        ).select("-password");

        res.status(httpStatus.OK).json({
            success: true,
            message: "Payout bank account linked and split-routing active!",
            subaccountCode: generatedSubaccountCode,
            vendor: updatedVendor
        });

    } catch (error) {
        console.error("[Paystack Subaccount Creation Error]:", error.message);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to link banking settlement routing profile.",
            error: error.message
        });
    }
};