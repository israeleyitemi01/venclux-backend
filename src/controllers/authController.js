import { User } from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { sendVerificationOtpMail } from "../config/emailEngine.js";

// ==========================================
// 1. REGISTER VENDOR
// ==========================================
export const register = async (req, res) => {
  try {
    const {
      name,
      businessName,
      email,
      storeSlug,
      whatsappNumber,
      password,
      businessNiche,
    } = req.body;

    // Clean up the slug format just in case
    const normalizedEmail = email.trim().toLowerCase();
    const standardizedSlug = storeSlug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    // Check if user already exists
    const userExist = await User.findOne({
      $or: [{ email: normalizedEmail }, { storeSlug: standardizedSlug }],
    });

    if (userExist) {
      return res.status(httpStatus.CONFLICT).json({
        statusCode: httpStatus.CONFLICT,
        success: false,
        message: "User already exists with this email or store slug",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a 6-digit random verification OTP string
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    // Create new unverified user entry inside MongoDB
    const newUser = new User({
      name: name || businessName,
      businessName,
      storeSlug: standardizedSlug,
      email: normalizedEmail,
      whatsappNumber,
      businessNiche,
      password: hashedPassword,
      verificationOtp: generatedOtp,
      otpExpiry: fiveMinutesFromNow,
      isVerified: false,
    });

    await newUser.save();

    // Dispatch OTP verification mail via Resend background loop
    try {
      const emailResult = await sendVerificationOtpMail(
        newUser.email,
        newUser.businessName,
        generatedOtp,
      );
      console.log("Email engine response tracking:", emailResult);
    } catch (emailError) {
      console.error("CRITICAL SMTP ERROR CAUGHT:", emailError.message);
    }

    res.status(httpStatus.CREATED).json({
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Vendor registered successfully. Verification OTP sent to your email.",
      user: { // Updated key name from 'vendor' to 'user'
        id: newUser._id,
        name: newUser.name,
        businessName: newUser.businessName,
        storeSlug: newUser.storeSlug,
        email: newUser.email,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// ==========================================
// 2. VERIFY REGISTRATION OTP
// ==========================================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Find the vendor trying to verify
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No vendor account found with this email address.",
      });
    }

    // Security Check 1: Does the OTP typed match MongoDB?
    if (user.verificationOtp !== otp) {
      return res.status(httpStatus.BAD_REQUEST).json({
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "The verification code is incorrect.",
      });
    }

    // Security Check 2: Has it been more than 5 minutes?
    if (new Date() > user.otpExpiry) {
      return res.status(httpStatus.GONE).json({
        statusCode: httpStatus.GONE,
        success: false,
        message: "This code has expired. Please request a new one.",
      });
    }

    // SUCCESS: Activation steps
    user.isVerified = true;
    user.verificationOtp = null; 
    user.otpExpiry = null; 
    await user.save();

    // Grant login token immediately
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    return res.status(httpStatus.OK).json({
      statusCode: httpStatus.OK,
      success: true,
      message: "Store verified successfully! Welcome to your dashboard.",
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName: user.businessName,
        storeSlug: user.storeSlug,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Server error while verifying token.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. RESEND FRESH OTP PAYLOAD
// ==========================================
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Vendor account not found.",
      });
    }

    const freshOtp = Math.floor(100000 + Math.random() * 900000).toString();

    user.verificationOtp = freshOtp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    sendVerificationOtpMail(user.email, user.businessName, freshOtp).catch(
      (err) => console.error("Resend delivery tracking issue:", err),
    );

    return res.status(httpStatus.OK).json({
      statusCode: httpStatus.OK,
      success: true,
      message: "A fresh verification code has been sent to your email.",
    });
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Server error while renewing verification code.",
      error: error.message,
    });
  }
};

// ==========================================
// 4. LOGIN VENDOR
// ==========================================
export const login = async (req, res) => {
  try {
    console.log("INBOUND LOGIN PAYLOAD:", req.body); 
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "User not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(httpStatus.FORBIDDEN).json({
        statusCode: httpStatus.FORBIDDEN,
        success: false,
        message: "Please verify your email registration token before accessing dashboard services.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    res.status(httpStatus.OK).json({
      statusCode: httpStatus.OK,
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName: user.businessName,
        storeSlug: user.storeSlug,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Server error during log in",
      error: error.message,
    });
  }
};