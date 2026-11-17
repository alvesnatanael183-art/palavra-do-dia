import express, { type Express, type Request, type Response } from "express";

const ROUTE = "/api/tts/speech";
const VOICE_ID = "CstacWqMhJQlnfLPxRG4";
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
const MAX_TEXT_LENGTH = 1200;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;
const DEFAULT_DAILY_REQUEST_LIMIT = 100;
const DEFAULT_DAILY_CHARACTER_LIMIT = 10_000;
const ALLOWED_ORIGINS = new Set([
  "https://alvesnatanael183-art.github.io",
  "https://palavradia-vw5zjnfk.manus.space",
]);

type DailyUsage = { day: string; requests: number; characters: number };

export type ElevenLabsTtsRouteLimits = {
  maxRequestsPerMinute?: number;
  maxDailyRequests?: number;
  maxDailyCharacters?: number;
  now?: () => number;
};

function setCorsHeaders(req: Request, res: Response) {
  const origin = req.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

async function readAudioBounded(response: globalThis.Response) {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    const announcedLength = Number(lengthHeader);
    if (Number.isFinite(announcedLength) && announcedLength > MAX_AUDIO_BYTES) {
      await response.body?.cancel();
      return null;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_AUDIO_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return totalBytes ? Buffer.concat(chunks, totalBytes) : null;
}

export function registerElevenLabsTtsRoutes(
  app: Express,
  limits: ElevenLabsTtsRouteLimits = {}
) {
  const requestsPerMinuteLimit =
    limits.maxRequestsPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE;
  const dailyRequestLimit =
    limits.maxDailyRequests ?? DEFAULT_DAILY_REQUEST_LIMIT;
  const dailyCharacterLimit =
    limits.maxDailyCharacters ?? DEFAULT_DAILY_CHARACTER_LIMIT;
  const now = limits.now ?? Date.now;
  let minuteWindowStart = now();
  let minuteRequestCount = 0;
  let dailyUsage: DailyUsage = {
    day: new Date(minuteWindowStart).toISOString().slice(0, 10),
    requests: 0,
    characters: 0,
  };

  function isRateLimited() {
    const timestamp = now();
    if (timestamp - minuteWindowStart >= RATE_WINDOW_MS) {
      minuteWindowStart = timestamp;
      minuteRequestCount = 0;
    }
    if (minuteRequestCount >= requestsPerMinuteLimit) return true;
    minuteRequestCount += 1;
    return false;
  }

  function consumeDailyBudget(text: string) {
    const today = new Date(now()).toISOString().slice(0, 10);
    if (today !== dailyUsage.day) {
      dailyUsage = { day: today, requests: 0, characters: 0 };
    }
    if (
      dailyUsage.requests >= dailyRequestLimit ||
      dailyUsage.characters + text.length > dailyCharacterLimit
    ) {
      return false;
    }
    dailyUsage.requests += 1;
    dailyUsage.characters += text.length;
    return true;
  }

  app.options(ROUTE, (req, res) => {
    if (!setCorsHeaders(req, res)) return res.status(403).end();
    return res.status(204).end();
  });

  // Parse only a small JSON payload before the application's larger upload parsers.
  app.post(ROUTE, express.json({ limit: "16kb" }), async (req, res) => {
    if (!setCorsHeaders(req, res)) {
      return res.status(403).json({ error: "origin_not_allowed" });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) return res.status(400).json({ error: "text_required" });
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: "text_too_long" });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "speech_service_unavailable" });
    }
    // Global budgets also bound usage when callers rotate IP addresses or forge Origin.
    if (isRateLimited()) {
      return res.status(429).json({ error: "site_rate_limited" });
    }
    if (!consumeDailyBudget(text)) {
      return res.status(429).json({ error: "daily_limit_reached" });
    }

    try {
      const upstream = await fetch(ELEVENLABS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!upstream.ok) {
        await upstream.body?.cancel();
        return res.status(upstream.status === 429 ? 429 : 502).json({
          error:
            upstream.status === 429
              ? "provider_rate_limited"
              : "speech_generation_failed",
        });
      }

      const contentType =
        upstream.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType && !contentType.startsWith("audio/")) {
        await upstream.body?.cancel();
        return res.status(502).json({ error: "speech_generation_failed" });
      }
      const audio = await readAudioBounded(upstream);
      if (!audio) {
        return res.status(502).json({ error: "speech_generation_failed" });
      }

      return res
        .status(200)
        .set({
          "Content-Type": "audio/mpeg",
          "Content-Length": String(audio.length),
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(audio);
    } catch {
      return res.status(502).json({ error: "speech_generation_failed" });
    }
  });
}
