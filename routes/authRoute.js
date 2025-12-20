import express from "express";
import { loginRequest, checkLoginStatus,getDeviceCount } from "../controllers/authController.js";
import { logout } from "../controllers/logoutController.js";

const router = express.Router();

router.post("/login-request", loginRequest);
router.post("/logout", logout);
router.get("/check-status/:staffId", checkLoginStatus);
router.get("/device-count/:staffId", getDeviceCount);


export default router;
