import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configure the SMTP pool transport engine for Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

/**
 * Global Mail Pipeline Engine (Nodemailer Edition)
 * Sends styled HTML emails seamlessly to any target address
 */
export const sendVerificationOtpMail = async (targetEmail, storeName, otpCode) => {
    try {
        const mailOptions = {
            from: `"Venclux Engine" <${process.env.GMAIL_USER}>`,
            to: targetEmail,
            subject: `[Venclux] Verify Your Storefront Engine Token: ${otpCode}`,
            html: `
                <div style="font-family: 'Arial', sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
                    <div style="margin-bottom: 24px;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #C3ECD7; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #0f172a; text-align: center; line-height: 32px;">V</div>
                        <span style="font-size: 16px; font-weight: bold; color: #0f172a; margin-left: 8px; vertical-align: middle;">Venclux</span>
                    </div>
                    
                    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Welcome to your dynamic storefront platform!</h2>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Thank you for registering <strong style="color: #0f172a;">${storeName}</strong>. To finalize your security initialization routing credentials and unlock your vendor administrative panel dashboard, please use the 6-digit verification code below:
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #059669; background-color: #f0fdf4; padding: 12px 24px; border-radius: 12px; border: 1px dashed #bbf7d0; letter-spacing: 4px; display: inline-block;">
                            ${otpCode}
                        </span>
                    </div>
                    
                    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                        This onboarding token is structurally active for <strong>5 minutes</strong>. If you did not initiate this marketplace platform deployment command request, please ignore this notification safely.
                    </p>
                    
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                    <p style="font-size: 11px; text-align: center; color: #94a3b8;">
                        Venclux Multi-Tenant Micro-SaaS Engine • Lagos, Nigeria
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("🚀 Live Production Mail Dispatched Successfully. ID:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        // 🌟 CRITICAL ERROR DIAGNOSTICS FOR RENDER LOGS
        console.error("❌ --- LIVE PRODUCTION MAIL RUNTIME FAILURE --- ❌");
        console.error("Reason:", err.message);
        console.error("Error Code:", err.code);
        if (err.command) console.error("SMTP Command attempted:", err.command);
        console.error("-------------------------------------------------");
        return { success: false, error: err.message };
    }
};



// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// export const sendVerificationOtpMail = async (targetEmail, storeName, otpCode) => {
//     try {
//         const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//                 user: process.env.GMAIL_USER,
//                 pass: process.env.GMAIL_PASS,
//             },
//         });

//         const mailOptions = {
//             from: `"Venclux Engine" <${process.env.GMAIL_USER}>`,
//             to: targetEmail,
//             subject: `[Venclux] Verify Your Storefront Engine Token: ${otpCode}`,
//             html: `<p>Your onboarding verification code is: <b>${otpCode}</b></p>` // Simplified for fast testing
//         };

//         // FORCE Node to wait until Gmail acknowledges the delivery
//         const info = await transporter.sendMail(mailOptions);
        
//         console.log("SMTP Server Accepted Delivery. Message ID:", info.messageId);
//         return { success: true, messageId: info.messageId };

//     } catch (err) {
//         // This will print directly to your terminal if Google blocks your App Password
//         console.error("DIAGNOSTIC ENGINE ERROR LOG:", err.message);
//         throw err; // Throws it upward to your controller's catch block
//     }
// };