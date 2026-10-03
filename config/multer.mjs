import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.join(__dirname, "../public/uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

// Set up storage engine
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".jpg" || ext === ".png" || ext === ".jpeg") {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .png, or .jpeg files are allowed."));
  }
};

const upload = multer({ storage, fileFilter });
export default upload;