// import express from "express";
// import upload from "../middlewares/uploadDocs.js";
// import uploadCampaignImages from "../middlewares/uploadCampaignsImages.js";
// import { authMiddleware } from "../middlewares/authMiddleware.js";
// import {
//   // Test
//   ngoHello,

//   // Auth
//   register,
//   login,
//   logout,
//   forgotPassword,
//   resetPassword,


//   // Profile
//   getNgo,
//   createOrUpdateProfile,
//   updateNGOProfilePicture,

//   // Documents
//   submitDocuments,
//   getDocumentStatus,

//   // Dashboard
//   getNgoDashboard,

//   // Campaigns
//   createCampaign,
//   updateCampaign,
//   deleteCampaign,
//   updateCampaignStatus,
//   getNgoCampaigns,
//   getSingleCampaign,
// } from "../controller/ngo.controller.js";

// const router = express.Router();

// /* ────────────────────────────────
//    📍 Test
// ──────────────────────────────── */
// router.get("/", ngoHello);

// /* ────────────────────────────────
//    🔐 Auth
// ──────────────────────────────── */
// router.post("/register",              register);
// router.post("/login",                 login);
// router.post("/logout",                authMiddleware, logout);
// router.post("/forgot-password",       forgotPassword);
// router.post("/reset-password/:token", resetPassword);
// router.patch("/change-password",      authMiddleware, changePassword);

// /* ────────────────────────────────
//    👤 Profile
//    ✅ GET /profile replaces POST /getngo-profile
// ──────────────────────────────── */
// router.get("/getngo-profile",         authMiddleware, getNgo);
// router.post("/create-profile", authMiddleware, createOrUpdateProfile);
// router.post(
//   "/profile-picture",
//   authMiddleware,
//   upload.single("profilePicture"),
//   updateNGOProfilePicture
// );

// /* ────────────────────────────────
//    📁 Documents
// ──────────────────────────────── */
// router.get("/document-status", authMiddleware, getDocumentStatus);
// router.post(
//   "/submit-documents",
//   authMiddleware,
//   upload.fields([
//     { name: "trustDeed",               maxCount: 1 },
//     { name: "certificate80G",          maxCount: 1 },
//     { name: "panCard",                 maxCount: 1 },
//     { name: "registrationCertificate", maxCount: 1 },
//     { name: "financialReport",         maxCount: 1 },
//   ]),
//   submitDocuments
// );

// /* ────────────────────────────────
//    📊 Dashboard
// ──────────────────────────────── */
// router.get("/dashboard", authMiddleware, getNgoDashboard);

// /* ────────────────────────────────
//    🚩 Campaigns
//    ✅ GET  /campaigns              replaces GET  /get-ngo-campaigns
//    ✅ POST /campaigns              replaces POST /create-campaign
//    ✅ PATCH /campaigns/:id/status  replaces POST /update-campaign-status
// ──────────────────────────────── */
// router.get("/campaigns",     authMiddleware, getNgoCampaigns);
// router.get("/campaigns/:id", authMiddleware, getSingleCampaign);

// router.post(
//   "/campaigns",
//   authMiddleware,
//   uploadCampaignImages.array("images", 3),
//   createCampaign
// );

// router.put(
//   "/campaigns/:id",
//   authMiddleware,
//   uploadCampaignImages.array("images", 3),
//   updateCampaign
// );

// router.patch("/campaigns/:id/status", authMiddleware, updateCampaignStatus);
// router.delete("/campaigns/:id",       authMiddleware, deleteCampaign);

// export default router;

// import express from "express";
// import upload from "../middlewares/uploadDocs.js";
// import {
//   ngoHello,
//   register,
//   login,
//   createOrUpdateProfile,
//   submitDocuments,
//   getNgo,
//   createCampaign,
//   updateCampaignStatus,
//   getNgoCampaigns
// } from "../controller/ngo.controller.js";
// import { authMiddleware } from "../middlewares/authMiddleware.js";
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// const router = express.Router();

// router.get("/", ngoHello);
// router.post("/register", register);
// router.post("/login", login);
// router.post("/create-profile", authMiddleware,createOrUpdateProfile);
// router.post("/getngo-profile",authMiddleware,getNgo);
// router.post("/create-campaign",authMiddleware,createCampaign);//creating the campaign
// router.post("/update-campaign-status",authMiddleware,updateCampaignStatus);
// router.get("/get-ngo-campaigns",authMiddleware,getNgoCampaigns);

// router.post(
//   "/submit-documents",
//   authMiddleware,
//   upload.fields([
//     { name: "trustDeed", maxCount: 1 },
//     { name: "certificate80G", maxCount: 1 },
//     { name: "panCard", maxCount: 1 },
//     { name: "registrationCertificate", maxCount: 1 },
//     { name: "financialReport", maxCount: 1 },
//   ]),
//   submitDocuments
// );

// //router.post('/ngo-profile-picture', upload.single('profilePicture'),authMiddleware, updateNGOProfilePicture);
// export default router;

import express from "express";
import upload from "../middlewares/uploadDocs.js";
import uploadCampaignImages from "../middlewares/uploadCampaignsImages.js"; // your campaign image multer
import {
  ngoHello,
  register,
  login,
  createOrUpdateProfile,
  submitDocuments,
  getNgo,
  createCampaign,
  updateCampaignStatus,
  getNgoCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  updateNGOProfilePicture,
  getDocumentStatus,
  saveBankDetails,
  getbankDetails
} from "../controller/ngo.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";


const router = express.Router();

// ── Auth ──────────────────────────────────────────────
router.get("/", ngoHello);
router.post("/register", register);
router.post("/login", login);

// ── Profile ───────────────────────────────────────────
router.post("/create-profile", authMiddleware, createOrUpdateProfile);
router.post("/getngo-profile", authMiddleware, getNgo);
router.post(
  "/ngo-profile-picture",
  authMiddleware,
  upload.single("profilePicture"),
  updateNGOProfilePicture
);

// ── Documents ─────────────────────────────────────────
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
router.get("/documents/status", authMiddleware, getDocumentStatus); // ✅ NEW

router.post("/bank-details", authMiddleware, saveBankDetails);
router.get("/bank-details", authMiddleware, getbankDetails); // ✅ NEW
// ── Campaigns ─────────────────────────────────────────
router.post("/create-campaign", authMiddleware,uploadCampaignImages.array("images", 5), createCampaign);
router.get("/get-ngo-campaigns", authMiddleware, getNgoCampaigns);
router.get("/campaigns/:id", authMiddleware, getCampaignById);           // ✅ NEW
router.put("/update-campaign-status/:id", authMiddleware, updateCampaign);            // ✅ NEW
router.delete("/campaigns/:id", authMiddleware, deleteCampaign);         // ✅ NEW
router.patch("/campaigns/:id/status", authMiddleware, updateCampaignStatus); // ✅ FIXED (was missing :id)

export default router;