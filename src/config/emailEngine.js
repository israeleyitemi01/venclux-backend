import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// 1. Initialize Resend for Live Production (uses HTTP API, avoiding SMTP port blocks)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 2. Fallback Nodemailer Transporter for local computer environment testing
const localTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
    connectionTimeout: 5000, 
});

/**
 * Global Mail Pipeline Engine (Hybrid Edition)
 * Automatically utilizes Resend API on Render Cloud, and drops back to Nodemailer on localhost
 */
export const sendVerificationOtpMail = async (targetEmail, storeName, otpCode) => {
    const emailSubject = `[Venclux] Verify Your Storefront Engine Token: ${otpCode}`;
    const emailHtmlBody = `
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
    `;

    // 🌟 ROUTING: If running live on Render, use Resend API
    if (process.env.RESEND_API_KEY && resend) {
        try {
            const response = await resend.emails.send({
                from: "Venclux Security <auth@venclux.site>", // Verified Namecheap sub-domain subroute
                to: targetEmail,
                subject: emailSubject,
                html: emailHtmlBody,
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            console.log("🚀 Live Production Mail Dispatched via Resend API. ID:", response.data?.id);
            return { success: true, messageId: response.data?.id };
        } catch (apiErr) {
            console.error("❌ --- LIVE PRODUCTION RESEND API FAILURE --- ❌");
            console.error("Reason:", apiErr.message);
            return { success: false, error: apiErr.message };
        }
    } 
    
    // 💻 LOCAL FALLBACK: Defaults back to your local Gmail SMTP setup when testing on your computer
    else {
        try {
            const info = await localTransporter.sendMail({
                from: `"Venclux Engine" <${process.env.GMAIL_USER}>`,
                to: targetEmail,
                subject: emailSubject,
                html: emailHtmlBody,
            });
            console.log("💻 Local Development Mail Dispatched via Gmail SMTP. ID:", info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (smtpErr) {
            console.error("❌ --- LOCAL DEVELOPMENT SMTP FAILURE --- ❌");
            console.error("Reason:", smtpErr.message);
            return { success: false, error: smtpErr.message };
        }
    }
};

/**
 * Send New Order Notification to Vendor
 * Exclusively uses Resend API as requested for live production
 */
export const sendNewOrderNotification = async (vendorEmail, storeName, orderDetails) => {
    const emailSubject = `[Venclux] 🚀 New Order Received: #${orderDetails.trackingId}`;
    const emailHtmlBody = `
        <div style="font-family: 'Arial', sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
            <div style="margin-bottom: 24px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #C3ECD7; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #0f172a; text-align: center; line-height: 32px;">V</div>
                <span style="font-size: 16px; font-weight: bold; color: #0f172a; margin-left: 8px; vertical-align: middle;">Venclux</span>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Cha-ching! You have a new order.</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Great news for <strong style="color: #0f172a;">${storeName}</strong>! A customer just placed an order on your storefront.
            </p>
            
            <div style="margin: 32px 0; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px; font-size: 14px;"><strong>Order ID:</strong> #${orderDetails.trackingId}</p>
                <p style="margin: 0 0 8px; font-size: 14px;"><strong>Amount:</strong> ₦${orderDetails.totalAmount?.toLocaleString()}</p>
                <p style="margin: 0; font-size: 14px;"><strong>Customer:</strong> ${orderDetails.customerName} (${orderDetails.customerWhatsapp})</p>
            </div>
            
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Please log in to your Venclux dashboard to view full details and process this order.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 11px; text-align: center; color: #94a3b8;">
                Venclux Multi-Tenant Micro-SaaS Engine • Lagos, Nigeria
            </p>
        </div>
    `;

    if (!resend) {
        console.error("❌ Resend API not initialized. Cannot send email.");
        return { success: false, error: "Resend API not initialized" };
    }

    try {
        const response = await resend.emails.send({
            from: "Venclux Orders <orders@venclux.site>", // Verified Namecheap sub-domain subroute
            to: vendorEmail,
            subject: emailSubject,
            html: emailHtmlBody,
        });

        if (response.error) {
            throw new Error(response.error.message);
        }

        console.log("🚀 Live Production Order Mail Dispatched via Resend API. ID:", response.data?.id);
        return { success: true, messageId: response.data?.id };
    } catch (apiErr) {
        console.error("❌ --- LIVE PRODUCTION RESEND API FAILURE --- ❌");
        console.error("Reason:", apiErr.message);
        return { success: false, error: apiErr.message };
    }
};

/**
 * Send Notification Settings Update Confirmation
 */
export const sendNotificationSettingsUpdateMail = async (vendorEmail, storeName) => {
    const emailSubject = `[Venclux] Notification Settings Updated`;
    const emailHtmlBody = `
        <div style="font-family: 'Arial', sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
            <div style="margin-bottom: 24px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #C3ECD7; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #0f172a; text-align: center; line-height: 32px;">V</div>
                <span style="font-size: 16px; font-weight: bold; color: #0f172a; margin-left: 8px; vertical-align: middle;">Venclux</span>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Settings Updated</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Hello from <strong style="color: #0f172a;">${storeName}</strong>, your notification settings have been successfully updated on Venclux.
            </p>
        </div>
    `;

    if (!resend) {
        return { success: false, error: "Resend API not initialized" };
    }

    try {
        const response = await resend.emails.send({
            from: "Venclux Security <auth@venclux.site>",
            to: vendorEmail,
            subject: emailSubject,
            html: emailHtmlBody,
        });

        if (response.error) throw new Error(response.error.message);
        return { success: true, messageId: response.data?.id };
    } catch (apiErr) {
        console.error("Reason:", apiErr.message);
        return { success: false, error: apiErr.message };
    }
};
