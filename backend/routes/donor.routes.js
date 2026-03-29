import { Router } from "express";
import { donorhello,getUser,register,login,upsertProfile,updateProfile,updateProfilePicture,logClickEvent, donorRecommendations, logDonationEvent } from "../controller/donor.controller.js";
import { donorAuth } from "../middlewares/authMiddleware.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from "express";

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
const router = express.Router();
router.get("/donor", donorhello);

router.post("/donor-register", register);
router.post("/donor-login",login)
router.post("/donor-recommendations", donorAuth, donorRecommendations);

router.post("/profile", donorAuth, upsertProfile);//creation of profile

//actions on the campaigns
//router.post("/view", donorAuth, logViewEvent);
router.post("/click", donorAuth, logClickEvent);
router.put("/donate", donorAuth,logDonationEvent )

router.route("/donor-user").post(getUser)
router.post('/donor-profile-picture', upload.single('profilePicture'), updateProfilePicture);
export default router