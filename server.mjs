import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

try {
  const envFile = await fs.readFile(path.join(rootDir, ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {
  // Environment variables can also be provided by the hosting platform.
}

const configPath = path.join(rootDir, "config", "app.config.json");
const dataDir = path.join(rootDir, "data");
const statsPath = path.join(dataDir, "stats.json");
const distDir = path.join(rootDir, "dist");
const appConfig = JSON.parse(await fs.readFile(configPath, "utf8"));
const stats = await loadStats();
const isDevelopment = process.argv.includes("--production") === false;
const port = Number(process.env.PORT || 5173);

async function loadStats() {
  try {
    return JSON.parse(await fs.readFile(statsPath, "utf8"));
  } catch {
    return { totalDownloads: 0, lastDownloadAt: null };
  }
}

async function saveStats() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function sendTelegramMessage(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error("Telegram is not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing");
    return false;
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
      }),
    });

    const telegramPayload = await telegramResponse.json();
    if (!telegramResponse.ok || !telegramPayload.ok) {
      console.error("Telegram API rejected the message", telegramPayload);
      return false;
    }

    return true;
  } catch {
    console.error("Telegram request failed");
    return false;
  }
}

function getClientIp(request) {
  const forwardedIp = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  return forwardedIp || request.socket.remoteAddress || "unknown";
}

function getOperatingSystem(userAgent) {
  if (/Windows NT 10\.0/i.test(userAgent)) return "Windows 10";
  if (/Windows NT 6\.3/i.test(userAgent)) return "Windows 8.1";
  if (/Windows NT 6\.2/i.test(userAgent)) return "Windows 8";
  if (/Windows NT 6\.1/i.test(userAgent)) return "Windows 7";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function getDeviceType(userAgent) {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return "Tablet";
  if (/Android|iPhone|iPod|Mobile/i.test(userAgent)) return "Phone";
  return "Computer";
}

function createDownloadNotification(request, requestUrl) {
  const userAgent = request.headers["user-agent"] || "Unknown User-Agent";
  const sourceUrl = request.headers.referer || request.headers.origin || requestUrl.href;
  const timestamp = new Date().toISOString().replace("T", " ").replace(".000Z", " UTC");

  return [
    getClientIp(request),
    timestamp,
    sourceUrl,
    userAgent,
    getOperatingSystem(userAgent),
    getDeviceType(userAgent),
  ].join("|");
}

async function pollTelegramCommands() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  let offset = 0;
  const updatesUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`;

  while (true) {
    try {
      const response = await fetch(`${updatesUrl}?timeout=20&offset=${offset}`, {
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error("Telegram polling failed");

      const payload = await response.json();
      for (const update of payload.result || []) {
        offset = update.update_id + 1;
        const message = update.message || update.channel_post;
        const chatId = String(message?.chat?.id || "");
        const command = String(message?.text || "").split(" ")[0].split("@")[0];

        if (chatId !== String(process.env.TELEGRAM_CHAT_ID) || command !== "/stats") continue;

        const lastDownload = stats.lastDownloadAt
          ? new Date(stats.lastDownloadAt).toLocaleString("en-US")
          : "Never";
        await sendTelegramMessage(
          `Download statistics\nTotal downloads: ${stats.totalDownloads}\nLast download: ${lastDownload}`,
        );
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

async function handleApi(request, response, requestUrl) {
  if (requestUrl.pathname === "/api/download" && request.method === "GET") {
    try {
      const fileResponse = await fetch(appConfig.downloadUrl);
      if (!fileResponse.ok) {
        sendJson(response, 502, { error: "Download source is unavailable." });
        return true;
      }

      stats.totalDownloads += 1;
      stats.lastDownloadAt = new Date().toISOString();
      await saveStats();
      await sendTelegramMessage(createDownloadNotification(request, requestUrl));

      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${appConfig.fileName}"`,
        ...(fileResponse.headers.get("content-length")
          ? { "Content-Length": fileResponse.headers.get("content-length") }
          : {}),
      });

      if (fileResponse.body) Readable.fromWeb(fileResponse.body).pipe(response);
      else response.end();
    } catch {
      sendJson(response, 502, { error: "Download source is unavailable." });
    }
    return true;
  }

  return false;
}

async function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const filePath = path.resolve(distDir, relativePath);

  if (!filePath.startsWith(`${distDir}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = filePath.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const vite = isDevelopment
  ? await createViteServer({ server: { middlewareMode: true }, appType: "spa" })
  : null;

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, requestUrl);
      if (!handled) sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (vite) vite.middlewares(request, response, () => {});
    else await serveStatic(request, response);
  } catch {
    if (!response.headersSent) sendJson(response, 500, { error: "Internal server error." });
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  void pollTelegramCommands();
});
