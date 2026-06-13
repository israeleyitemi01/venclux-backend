import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { User } from "../models/user.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                statusCode: httpStatus.UNAUTHORIZED,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by ID from token
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                statusCode: httpStatus.NOT_FOUND,
                message: "User not found"
            });
        }

        // Assigning the real retrieved database user object to the request lifecycle
        req.user = user; 
        
        next();
    } catch (error) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            statusCode: httpStatus.UNAUTHORIZED,
            message: "Invalid or expired token",
            error: error.message
        });
    }
};

export default authMiddleware;