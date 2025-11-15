import crypto from "crypto";

export function hashAdminPassword(password) {
  return crypto.createHash("sha256")
    .update(password)
    .digest("base64");
}
