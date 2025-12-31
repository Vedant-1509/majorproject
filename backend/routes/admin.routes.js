// import { Router } from "express";
// import { adminhello } from "../controller/admin.controller.js";

// const adminrouter = Router();
// adminrouter.route("/admin").get(adminhello); 
// export default adminrouter;

import express from "express";
import {
  getPendingNGOs,
  verifyNGO,
  rejectNGO,
  verifyNGOByDarpan,
  getAllNGOs,
  disableCampaign,
  getReports,
  getDashboardStats,
  adminLogin,
  register,
  getApprovedNGOs,
  getRejectedNGOs,
} from "../controller/admin.controller.js";
const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/admin/signup", register);
router.get("/ngos/pending", getPendingNGOs);
router.get("/ngos/approved", getApprovedNGOs);
router.get("/ngos/rejected", getRejectedNGOs);
router.post("/ngos/verify/:ngoId", verifyNGO);
router.post("/ngos/reject/:ngoId", rejectNGO);
router.get("/ngos/verify-darpan/:urn", verifyNGOByDarpan);
router.get("/ngos/all", getAllNGOs);
router.put("/campaigns/disable/:campaignId", disableCampaign);
router.get("/admin/reports", getReports);

router.get("/dashboard/stats", getDashboardStats);

export default router;
