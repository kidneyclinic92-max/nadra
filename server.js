/**
 * Azure App Service runs `node server.js` when this file exists.
 * Stay in-process so the PID Azure health-checks is the one that binds PORT.
 */
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

if (process.env.WEBSITE_SITE_NAME) {
  process.env.PORT ||= "8080";
  process.env.HOSTNAME ||= "0.0.0.0";
  process.env.DATABASE_URL ||= "file:/home/data/nadra.db";
  process.env.UPLOAD_DIR ||= "/home/data/uploads";
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    const secretFile = "/home/data/auth-secret";
    try {
      mkdirSync("/home/data", { recursive: true });
      if (existsSync(secretFile)) {
        process.env.AUTH_SECRET = readFileSync(secretFile, "utf8").trim();
      } else {
        process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
        writeFileSync(secretFile, process.env.AUTH_SECRET);
      }
    } catch (error) {
      console.error("Could not persist AUTH_SECRET", error);
    }
  }
} else {
  process.env.PORT ||= "3000";
  process.env.HOSTNAME ||= "0.0.0.0";
}

try {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), {
      recursive: true,
    });
  }
  if (process.env.UPLOAD_DIR) {
    mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  }
} catch (error) {
  console.error("Could not create data directories", error);
}

const standalone = path.join(__dirname, "next-server.js");
if (existsSync(standalone)) {
  require(standalone);
} else {
  const nextBin = require.resolve("next/dist/bin/next");
  process.argv = [
    process.argv[0],
    nextBin,
    "start",
    "-H",
    process.env.HOSTNAME,
    "-p",
    String(process.env.PORT),
  ];
  require(nextBin);
}
