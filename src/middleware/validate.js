export const validate = (schema) => {
  return (req, res, next) => {
    // 1. If a file was uploaded via Multer, map the string path directly to the body
    if (req.file && req.file.path) {
      req.body.image = req.file.path;
    } 
    // 2. If no file was sent but JavaScript converted null into a string, clean it out
    else if (req.body.image === "null" || req.body.image === null || req.body.image === "") {
      delete req.body.image; 
    }

    // Run Joi validation
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false, 
      allowUnknown: true, 
      stripUnknown: true  
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    // Assign sanitized data back to body
    req.body = value;
    next();
  };
};