import express from "express";
import {
  registerStaff,
  loginRequest,
  checkLoginStatus,
  staffLogin,
  adminLogin
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerStaff);
router.post("/login-request", loginRequest);
router.get("/check-status/:staffId", checkLoginStatus);
router.post("/login", staffLogin);
router.post("/admin/login", adminLogin);

export default router;
