import crypto from "crypto";

export function generateEmpPwdHash(contId, plainPassword) {
  const source = `${contId}${plainPassword}`;
  const buf = Buffer.from(source, "utf16le");
  const md5 = crypto.createHash("md5").update(buf).digest();
  return md5.toString("base64");
}
