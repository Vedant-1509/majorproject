import express from "express";
import {
  getPendingNGOs,
  verifyNGO,
  rejectNGO,
  getAllNGOs,
  disableCampaign,
  getReports,
  adminLogin,
  registerAdmin,
  getApprovedNGOs,
  getRejectedNGOs,
} from "../controller/admin.controller.js";
const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/admin/signup", registerAdmin);
router.get("/ngos/pending", getPendingNGOs);


router.get("/ngos/approved", getApprovedNGOs);
router.get("/ngos/rejected", getRejectedNGOs);

router.patch("/ngos/verify/:ngoId", verifyNGO);
router.post("/ngos/reject/:ngoId", rejectNGO);

router.get("/ngos/all", getAllNGOs);

router.put("/campaigns/disable/:campaignId", disableCampaign);
router.get("/admin/reports", getReports);



export default router;
