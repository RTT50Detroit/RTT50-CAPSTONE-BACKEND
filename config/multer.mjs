import multer from "multer";
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".jpg" || ext === ".png" || ext === ".jpeg") {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .png, or .jpeg files are allowed."));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});
export default upload;