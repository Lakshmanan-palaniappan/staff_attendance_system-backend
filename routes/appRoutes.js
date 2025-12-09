import express from "express";
import { getLatestVersion } from "../controllers/appController.js";

const router = express.Router();

router.get("/latest-version", getLatestVersion);

export default router;
