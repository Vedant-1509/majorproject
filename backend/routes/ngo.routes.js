// import { Router } from "express";
// import { ngoHello,register,login,createProfile,updateProfile } from "../controller/ngo.controller.js";
// const ngorouter = Router();
// ngorouter.route("/ngo").get(ngoHello);
// ngorouter.route("/ngo-register").post(register)
// ngorouter.route("/ngo-login").post(login)
// ngorouter.route("/ngo-profile").post(createProfile)
// ngorouter.route("/ngo-updateprofile").put(updateProfile)
// export default ngorouter

import express from "express";
import upload from "../middlewares/uploadDocs.js";
import {
  ngoHello,
  register,
  login,
  createProfile,
  updateProfile,
  submitDocuments,
} from "../controller/ngo.controller.js";

const router = express.Router();

router.get("/", ngoHello);
router.post("/register", register);
router.post("/login", login);
router.post("/create-profile", createProfile);
router.put("/update-profile", updateProfile);

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

export default router;
