import express from "express";
import upload from "../middlewares/uploadDocs.js";
import {
  ngoHello,
  register,
  login,
  createOrUpdateProfile,
  submitDocuments,
  getNgo,
  updateNGOProfilePicture
} from "../controller/ngo.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.get("/", ngoHello);
router.post("/register", register);
router.post("/login", login);
router.post("/create-profile", authMiddleware,createOrUpdateProfile);
router.post("/getngo-profile",authMiddleware,getNgo);

router.post(
  "/submit-documents",
  authMiddleware,
  upload.fields([
    { name: "trustDeed", maxCount: 1 },
    { name: "certificate80G", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "financialReport", maxCount: 1 },
  ]),
  submitDocuments
);
router.post(
  "/submit-documents",
  authMiddleware,
  upload.fields([
    { name: "trustDeed", maxCount: 1 },
    { name: "certificate80G", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "registrationCertificate", maxCount: 1 },
    { name: "financialReport", maxCount: 1 },
  ]),
  submitDocuments
);
//router.post('/ngo-profile-picture', upload.single('profilePicture'),authMiddleware, updateNGOProfilePicture);
export default router;
