import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8"),
);
const port = 3012;
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("HTTP smoke server did not start.")), 10000);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Local:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`HTTP server exited ${code}`));
    });
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  const paths = [
    "/",
    "/races/",
    "/guides/",
    "/about/",
    "/privacy/",
    "/guides/choose-your-first-10k/",
    "/guides/race-registration-checklist/",
    "/guides/compare-half-marathons/",
    ...catalog
      .filter((r) => r.publication === "published" && r.verification === "verified")
      .map((r) => `/races/${r.date.slice(0, 4)}/${r.slug}/`),
  ];
  for (const path of paths) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: "HEAD" });
    if (response.status !== 200)
      throw new Error(`${path}: expected 200, received ${response.status}`);
    if (!(response.headers.get("content-type") ?? "").includes("text/html"))
      throw new Error(`${path}: wrong content type`);
  }
  const missing = await fetch(`http://127.0.0.1:${port}/missing-race/`, { method: "HEAD" });
  if (missing.status !== 404) throw new Error("Missing routes must return 404.");
  const post = await fetch(`http://127.0.0.1:${port}/`, { method: "POST" });
  if (post.status !== 405) throw new Error("Static preview must reject POST.");
  console.log(
    `HTTP smoke passed: ${paths.length} page routes return 200; 404 and 405 handling verified.`,
  );
} finally {
  server.kill();
}
