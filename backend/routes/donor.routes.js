import { Router } from "express";
import { donorhello,register,login,createProfile,updateProfile } from "../controller/donor.controller.js";


const router = Router();

router.route("/donor").get(donorhello);
router.route("/donor-register").post(register)
router.route("/donor-login").post(login)
router.route("/donor-profile").post(createProfile)
router.route("/donor-updateprofile").put(updateProfile)
export default router