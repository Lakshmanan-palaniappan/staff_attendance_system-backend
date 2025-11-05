import express from "express";
import { getStaffDetails } from "../controllers/staffController.js";

const router = express.Router();

router.get("/:staffId", getStaffDetails);

router.get("/", getStaffDetails);

export default router;
