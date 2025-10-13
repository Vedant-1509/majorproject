import { Router } from "express";
import { donorhello,getUser,register,login,createProfile,updateProfile,updateProfilePicture } from "../controller/donor.controller.js";

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/donor';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });
const router = Router();

router.route("/donor").get(donorhello);
router.route("/donor-register").post(register)
router.route("/donor-login").post(login)
router.route("/donor-profile").post(createProfile)
router.route("/donor-updateprofile").put(updateProfile)
router.route("/donor-user").post(getUser)
router.post('/donor-profile-picture', upload.single('profilePicture'), updateProfilePicture);
export default router