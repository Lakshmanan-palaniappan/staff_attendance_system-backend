// routes/staffRoutes.js
import express from "express";
import {
  getMyProfile,
  getMyAttendanceToday,
  getMyAttendanceAll,
  getMyAttendancePairs
} from "../controllers/staffController.js";

const router = express.Router();

router.get("/me/:staffId", getMyProfile);
router.get("/attendance/today/:staffId", getMyAttendanceToday);
router.get("/attendance/all/:staffId", getMyAttendanceAll);
router.get("/attendance/pairs/:staffId", getMyAttendancePairs);

export default router;
