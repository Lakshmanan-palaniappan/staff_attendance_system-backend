import express from "express";
import { loginRequest, checkLoginStatus } from "../controllers/authController.js";

const router = express.Router();

router.post("/login-request", loginRequest);
router.get("/check-status/:staffId", checkLoginStatus);

export default router;
