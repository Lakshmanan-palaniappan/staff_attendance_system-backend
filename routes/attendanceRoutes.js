import express from "express";
import { markAttendance, getTodayAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/mark", markAttendance);
router.get("/today/:staffId", getTodayAttendance);

export default router;
