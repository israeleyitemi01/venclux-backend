// import express from "express";
// import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
// import authMiddleware from "../middleware/authMiddleware.js";
// import { validate } from "../middleware/validate.js";
// import { productSchema, updateProductSchema } from "../validators/productValidator.js";

// const router = express.Router();

// router.use(authMiddleware);

// router.get("/list", getProducts);
// router.post("/create", validate(productSchema), createProduct);
// router.put("/update/:id", validate(updateProductSchema), updateProduct);
// router.delete("/delete/:id", deleteProduct); 

// export default router;


import express from "express";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";
import { validate } from "../middleware/validate.js";
import { productSchema, updateProductSchema } from "../validators/productValidator.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/list", getProducts);

// Use Multer middleware to parse standard single file items matching form names 
router.post("/create", upload.single("image"), validate(productSchema), createProduct);
router.put("/update/:id", upload.single("image"), validate(updateProductSchema), updateProduct);
router.delete("/delete/:id", deleteProduct);

export default router;