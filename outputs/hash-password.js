const { hashPassword } = require("./auth");

const password = process.argv[2] || process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("Usage: node outputs/hash-password.js <password>");
  process.exit(1);
}

console.log(hashPassword(password));
