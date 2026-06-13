import { Product } from "../models/product.js";
import { cloudinary } from "../config/cloudinary.js";
import { extractPublicIdFromUrl } from "../utils/cloudinaryHelper.js";
import httpStatus from "http-status";

// GET ALL PRODUCTS
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ vendorId: req.user._id }).sort({ createdAt: -1 });
        return res.status(httpStatus.OK).json({ success: true, data: products });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to retrieve products",
            error: error.message
        });
    }
};

// CREATE NEW PRODUCT WITH IMAGE UPLOAD
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, lowStockThreshold, category, badge } = req.body;

        // Extract cloud URL if an image file was attached via multipart form data
        const imageUrl = req.file ? req.file.path : req.body.image || "";

        const newProduct = await Product.create({
            vendorId: req.user._id,
            name,
            description,
            price: Number(price),
            stock: Number(stock),
            lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
            image: imageUrl,
            category: category || "Uncategorized",
            badge
        });

        return res.status(httpStatus.CREATED).json({ success: true, data: newProduct });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to create product",
            error: error.message
        });
    }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, lowStockThreshold, category, badge } = req.body;
        
        let updateData = { name, description, price: Number(price), stock: Number(stock), lowStockThreshold, category, badge };

        // Fetch old item parameters to clear out old image assets if a new file gets swapped in
        const currentProduct = await Product.findOne({ _id: id, vendorId: req.user._id });
        if (!currentProduct) {
            return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Product not found." });
        }

        if (req.file) {
            // Clean up old asset from Cloudinary
            const oldPublicId = extractPublicIdFromUrl(currentProduct.image);
            if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId);
            
            updateData.image = req.file.path;
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { _id: id, vendorId: req.user._id },
            updateData,
            { new: true }
        );
        
        return res.status(httpStatus.OK).json({ success: true, data: updatedProduct });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to update product",
            error: error.message
        });
    }
};

// DELETE PRODUCT & PURGE CLOUDINARY STORAGE
export const deleteProduct = async (req, res) => { 
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, vendorId: req.user._id });
        if (!product) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "Product not found or unauthorized." 
            });
        }

        // 1. Purge asset from Cloudinary storage bucket context safely
        const publicId = extractPublicIdFromUrl(product.image);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        // 2. Drop item from database collection
        await Product.deleteOne({ _id: id });

        return res.status(httpStatus.OK).json({
            statusCode: httpStatus.OK,
            message: "Product and associated cloud media asset deleted successfully"
        });
    } catch (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to delete product", 
            error: error.message
        });
    }
};