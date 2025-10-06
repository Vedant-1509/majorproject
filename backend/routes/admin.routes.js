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
  adminhello,
  adminsignup
} from "../controller/admin.controller.js";
const adminrouter = express.Router();

adminrouter.route("/admin").get(adminhello);//done
adminrouter.route("/admin/signup").post(adminsignup);//done
adminrouter.post("/admin/login", adminLogin);//done
adminrouter.get("/ngos/pending", getPendingNGOs);//done
adminrouter.patch("/ngos/verify/:ngoId", verifyNGO);
// adminrouter.patch("/ngos/verify/:ngoId", (req, res) => {
//   console.log("Params received:", req.params);
//   res.send("Test");
// });

adminrouter.post("/ngos/reject/:ngoId", rejectNGO);
adminrouter.get("/ngos/verify-darpan/:urn", verifyNGOByDarpan);
adminrouter.get("/ngos/all", getAllNGOs);
adminrouter.put("/campaigns/disable/:campaignId", disableCampaign);
adminrouter.get("/reports", getReports);

adminrouter.get("/dashboard/stats", getDashboardStats);

export default adminrouter;
