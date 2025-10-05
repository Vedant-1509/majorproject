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
} from "../controller/admin.controller.js";
const router = express.Router();

router.post("/admin/login", adminLogin);
router.get("/ngos/pending", getPendingNGOs);
router.post("/ngos/verify/:ngoId", verifyNGO);
router.post("/ngos/reject/:ngoId", rejectNGO);
router.get("/ngos/verify-darpan/:urn", verifyNGOByDarpan);
router.get("/ngos/all", getAllNGOs);
router.put("/campaigns/disable/:campaignId", disableCampaign);
router.get("/reports", getReports);

router.get("/dashboard/stats", getDashboardStats);

export default router;
