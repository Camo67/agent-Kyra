import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright-core";

const DEFAULT_BROWSER_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
];

const DEFAULT_VIEWPORT = Object.freeze({
  width: 1440,
  height: 900
});

function cleanText(value) {
  return String(value ?? "").trim();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function trimText(value, maxLength) {
  const text = cleanText(value);
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function sanitizeSegment(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBrowserExecutable(explicitPath) {
  const candidates = [
    cleanText(explicitPath),
    cleanText(process.env.PLAYWRIGHT_BROWSER_PATH),
    ...DEFAULT_BROWSER_CANDIDATES
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Browser executable not found. Set PLAYWRIGHT_BROWSER_PATH or install Chrome/Chromium."
  );
}

function normalizeUrl(value) {
  const url = cleanText(value);
  if (!url) {
    throw new Error("Field 'url' is required");
  }

  try {
    return new URL(url).href;
  } catch {
    throw new Error("Field 'url' must be a valid absolute URL");
  }
}

function resolveScreenshotPath(url, requestedPath, outputDir) {
  if (requestedPath) {
    return path.isAbsolute(requestedPath)
      ? requestedPath
      : path.resolve(process.cwd(), requestedPath);
  }

  const parsedUrl = new URL(url);
  const host = sanitizeSegment(parsedUrl.hostname);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(outputDir, `${stamp}-${host}.png`);
}

export async function runPlaywrightTask(payload = {}, options = {}) {
  const startedAt = Date.now();
  const url = normalizeUrl(payload.url);
  const timeoutMs = clamp(
    toInteger(payload.timeoutMs, toInteger(options.timeoutMs, 30000)),
    1000,
    120000
  );
  const afterLoadWaitMs = clamp(
    toInteger(payload.afterLoadWaitMs, toInteger(options.afterLoadWaitMs, 0)),
    0,
    15000
  );
  const maxTextLength = clamp(
    toInteger(payload.maxTextLength, toInteger(options.maxTextLength, 4000)),
    200,
    20000
  );
  const extractSelector = cleanText(payload.extractSelector ?? payload.selector ?? "body");
  const screenshotEnabled = payload.screenshot !== false;
  const viewport = {
    width: clamp(
      toInteger(payload.viewport?.width, toInteger(payload.viewportWidth, DEFAULT_VIEWPORT.width)),
      320,
      4096
    ),
    height: clamp(
      toInteger(payload.viewport?.height, toInteger(payload.viewportHeight, DEFAULT_VIEWPORT.height)),
      240,
      4096
    )
  };
  const outputDir = path.resolve(
    process.cwd(),
    cleanText(payload.outputDir ?? options.outputDir ?? process.env.PLAYWRIGHT_OUTPUT_DIR) || "output/playwright"
  );
  const browserExecutable = await resolveBrowserExecutable(options.browserExecutablePath);

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: browserExecutable,
      headless: payload.headless !== false
    });

    const extraHeaders = Object.fromEntries(
      Object.entries(payload.headers && typeof payload.headers === "object" ? payload.headers : {})
        .filter(([key, value]) => cleanText(key) && value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    );
    const context = await browser.newContext({
      viewport,
      userAgent: cleanText(payload.userAgent) || undefined,
      extraHTTPHeaders: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: payload.waitUntil ?? "domcontentloaded",
      timeout: timeoutMs
    });

    const selector = cleanText(payload.selector);
    if (selector) {
      await page.waitForSelector(selector, { timeout: timeoutMs });
    }

    if (afterLoadWaitMs > 0) {
      await page.waitForTimeout(afterLoadWaitMs);
    }

    let extractedText = "";
    if (extractSelector) {
      extractedText = await page.locator(extractSelector).first().innerText({ timeout: timeoutMs });
    }

    let screenshotPath = null;
    if (screenshotEnabled) {
      await mkdir(outputDir, { recursive: true });
      screenshotPath = resolveScreenshotPath(url, cleanText(payload.screenshotPath), outputDir);
      await mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({
        path: screenshotPath,
        fullPage: payload.fullPage !== false
      });
    }

    return {
      ok: true,
      url: page.url(),
      title: await page.title(),
      selectorMatched: Boolean(selector),
      extractSelector,
      text: trimText(extractedText, maxTextLength),
      screenshotPath,
      browserExecutable,
      tookMs: Date.now() - startedAt
    };
  } finally {
    await browser?.close();
  }
}

export default runPlaywrightTask;
