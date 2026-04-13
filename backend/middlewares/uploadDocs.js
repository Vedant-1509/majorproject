// import multer from "multer";
// import path from "path";
// import fs from "fs";

// // Directory for uploads
// const dir = "./uploads/documents";
// if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, dir);
//   },
//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     const uniqueName = `${Date.now()}_${file.fieldname}${ext}`;
//     cb(null, uniqueName);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowed.includes(ext)) cb(null, true);
//   else cb(new Error("Only PDF, PNG, JPG, JPEG allowed"));
// };

// const upload = multer({ storage, fileFilter });
// export default upload;


import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadDir = "./uploads/ngo";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });
export default upload;