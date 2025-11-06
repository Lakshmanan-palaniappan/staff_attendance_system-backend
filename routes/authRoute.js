import express from "express";
import { registerStaff, loginRequest } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerStaff);
router.post("/login-request", loginRequest);

export default router;
