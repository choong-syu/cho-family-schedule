const crypto = require("crypto");

const DEFAULT_ADMIN_PASSWORD_HASH = "pbkdf2$sha256$210000$Y2hvLWZhbWlseS1hZG1pbi12MQ==$lLXZrrrwef67M9enIjaJfEgA22v1S5IjsOFYb1m9VvI=";
const HASH_PATTERN = /^pbkdf2\$(sha256|sha512)\$(\d+)\$([^$]+)\$([^$]+)$/;

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password, options = {}) {
  const digest = options.digest || "sha256";
  const iterations = Number(options.iterations || 210000);
  const keyLength = Number(options.keyLength || 32);
  const salt = options.salt ? Buffer.from(options.salt) : crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(String(password), salt, iterations, keyLength, digest);
  return ["pbkdf2", digest, iterations, salt.toString("base64"), derived.toString("base64")].join("$");
}

function verifyPassword(password, storedHash = DEFAULT_ADMIN_PASSWORD_HASH) {
  const match = HASH_PATTERN.exec(storedHash || "");
  if (!match) return false;

  const [, digest, iterationText, saltBase64, expectedBase64] = match;
  const iterations = Number(iterationText);
  if (!Number.isSafeInteger(iterations) || iterations < 100000) return false;

  const salt = Buffer.from(saltBase64, "base64");
  const expected = Buffer.from(expectedBase64, "base64");
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, expected.length, digest);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH;
}

module.exports = {
  DEFAULT_ADMIN_PASSWORD_HASH,
  getAdminPasswordHash,
  hashPassword,
  timingSafeEqualText,
  verifyPassword
};
