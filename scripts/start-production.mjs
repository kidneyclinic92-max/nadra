/**
 * Azure App Service (and any host that sets PORT) entrypoint.
 *
 * Azure Linux runs `npm start`. If a custom startup command chains
 * `prisma migrate deploy && next start`, a migrate failure means Next never
 * binds PORT and the platform returns 503. This script always starts Next.
 */
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const onAzure = Boolean(process.env.WEBSITE_SITE_NAME);
const port = process.env.PORT ?? (onAzure ? "8080" : "3000");

if (onAzure) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:/home/data/nadra.db";
  }
  if (!process.env.UPLOAD_DIR) {
    process.env.UPLOAD_DIR = "/home/data/uploads";
  }
}

function sqliteFilePath(url) {
  if (!url?.startsWith("file:")) return null;
  const rest = url.slice("file:".length);
  return path.resolve(process.cwd(), rest);
}

try {
  const dbFile = sqliteFilePath(process.env.DATABASE_URL);
  if (dbFile) mkdirSync(path.dirname(dbFile), { recursive: true });
  if (process.env.UPLOAD_DIR) {
    mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  }
} catch (error) {
  console.error("Could not create data directories", error);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

try {
  await run("npx", ["prisma", "generate"]);
} catch (error) {
  console.error("prisma generate failed", error);
}

try {
  await run("npx", ["prisma", "migrate", "deploy"]);
} catch (error) {
  console.error(
    "prisma migrate deploy failed — starting the app anyway so Azure is not left with a 503",
    error,
  );
}

await run("npx", ["next", "start", "-H", "0.0.0.0", "-p", String(port)]);
