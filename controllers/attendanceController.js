import { AttendanceModel } from "../models/attendanceModel.js";
import { AppConfigModel } from "../models/appConfigModel.js";

// Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function markAttendance(req, res) {
  const { staffId, lat, lng } = req.body;

  try {
    const config = await AppConfigModel.getConfig();
    if (!config) throw new Error("AppConfig not found");

    const distance = getDistance(lat, lng, config.CollegeLat, config.CollegeLng);
    const todayRecords = await AttendanceModel.getTodayByStaff(staffId);
    const lastStatus = todayRecords.length
      ? todayRecords[0].CheckType.toLowerCase()
      : null;

    let newStatus;

    if (!lastStatus) {
      if (distance > config.AllowedRadiusMeters) {
        return res.status(400).json({ error: "Cannot check in outside geofence" });
      }
      newStatus = "checkin";
    } else if (lastStatus === "checkin") {
      if (distance <= config.AllowedRadiusMeters) {
        return res.status(400).json({ error: "Still inside geofence, cannot check out" });
      }
      newStatus = "checkout";
    } else if (lastStatus === "checkout") {
      if (distance > config.AllowedRadiusMeters) {
        return res.status(400).json({ error: "Cannot check in outside geofence" });
      }
      newStatus = "checkin";
    }

    await AttendanceModel.markAttendance({
      staffId,
      checkType: newStatus,
      latitude: lat,
      longitude: lng,
    });

    res.json({
      message: `Attendance marked: ${newStatus}`,
      currentStatus: newStatus,
    });
  } catch (err) {
    console.error("Attendance Error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getTodayAttendance(req, res) {
  const { staffId } = req.params;

  try {
    const records = await AttendanceModel.getTodayByStaff(staffId);
    res.json(records);
  } catch (err) {
    console.error("Fetch Attendance Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
