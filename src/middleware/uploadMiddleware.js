const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    // Create a proper error that can be detected
    const error = new Error('Invalid file type. Only JPEG and PNG images are allowed.');
    error.name = 'MulterError';
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

/**
 * Middleware wrapper to handle multer errors properly
 * Catches multer errors and passes them to the error handler with proper format
 */
const handleMulterUpload = (fieldName) => {
  return (req, res, next) => {
    const multerSingle = upload.single(fieldName);

    multerSingle(req, res, (err) => {
      if (err) {
        // Ensure error has proper name for error handler detection
        if (err instanceof multer.MulterError || err.code === 'INVALID_FILE_TYPE') {
          err.name = 'MulterError';
          err.statusCode = 400;
        }
        return next(err);
      }
      next();
    });
  };
};

module.exports = upload;
module.exports.handleMulterUpload = handleMulterUpload;
