import express from "express";
import upload from "../middlewares/uploadDocs.js";
import {
  ngoHello,
  register,
  login,
  createProfile,
  updateProfile,
  submitDocuments,
  getNgo,
  updateNGOProfilePicture
} from "../controller/ngo.controller.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer storage
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadDir = './uploads/donor';
//     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// export const upload = multer({ storage });
const router = express.Router();

router.get("/", ngoHello);
router.post("/register", register);
router.post("/login", login);
router.post("/create-profile", createProfile);
router.put("/update-profile", updateProfile);
router.post("/getngo-profile",getNgo);

router.post(
  "/submit-documents",
  upload.fields([
    { name: "trustDeed", maxCount: 1 },
    { name: "certificate80G", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "financialReport", maxCount: 1 },
  ]),
  submitDocuments
);
router.post('/ngo-profile-picture', upload.single('profilePicture'), updateNGOProfilePicture);
export default router;
