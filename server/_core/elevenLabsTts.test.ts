import express from "express";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerElevenLabsTtsRoutes,
  type ElevenLabsTtsRouteLimits,
} from "./elevenLabsTts";

const allowedOrigin = "https://alvesnatanael183-art.github.io";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function createApp(limits?: ElevenLabsTtsRouteLimits) {
  const app = express();
  registerElevenLabsTtsRoutes(app, limits);
  return app;
}

function postJson(app: express.Express, body: unknown, origin = allowedOrigin) {
  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
  }>((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      const request = httpRequest(
        {
          host: "127.0.0.1",
          port: address.port,
          path: "/api/tts/speech",
          method: "POST",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Connection: "close",
          },
        },
        response => {
          const chunks: Buffer[] = [];
          response.on("data", chunk => chunks.push(Buffer.from(chunk)));
          response.on("end", () => {
            server.close(error => {
              if (error) return reject(error);
              resolve({
                status: response.statusCode ?? 0,
                headers: response.headers,
                body: Buffer.concat(chunks),
              });
            });
          });
        }
      );
      request.on("error", error => server.close(() => reject(error)));
      request.end(JSON.stringify(body));
    });
    server.on("error", reject);
  });
}

describe("ElevenLabs TTS proxy", () => {
  it("uses the fixed voice and keeps the provider key server-side while returning audio", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    const upstreamFetch = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        })
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await postJson(createApp(), {
      text: "Salmo 23: O Senhor é meu pastor.",
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/mpeg");
    expect(response.body).toEqual(Buffer.from([1, 2, 3]));
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    const [url, options] = upstreamFetch.mock.calls[0];
    expect(String(url)).toContain("/v1/text-to-speech/CstacWqMhJQlnfLPxRG4?");
    expect(new Headers(options?.headers).get("xi-api-key")).toBe(
      "test-only-provider-key"
    );
    expect(JSON.parse(String(options?.body))).toEqual({
      text: "Salmo 23: O Senhor é meu pastor.",
      model_id: "eleven_multilingual_v2",
    });
  });

  it("rejects other web origins without contacting the provider", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await postJson(
      createApp(),
      { text: "Texto de teste." },
      "https://example.com"
    );

    expect(response.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects empty or oversized text before provider use", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);
    const app = createApp();

    const empty = await postJson(app, { text: "  " });
    const tooLong = await postJson(app, { text: "x".repeat(1201) });

    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("applies a global request-per-minute limit", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(new Uint8Array([1]), {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" },
          })
      )
    );
    const app = createApp({ maxRequestsPerMinute: 2 });

    const first = await postJson(app, { text: "Leitura 1" });
    const second = await postJson(app, { text: "Leitura 2" });
    const third = await postJson(app, { text: "Leitura 3" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });

  it("enforces a daily site-wide cap", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    const upstreamFetch = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array([1]), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        })
    );
    vi.stubGlobal("fetch", upstreamFetch);
    const app = createApp({
      maxRequestsPerMinute: 30,
      maxDailyRequests: 2,
      maxDailyCharacters: 10_000,
    });

    const first = await postJson(app, { text: "Leitura A" });
    const second = await postJson(app, { text: "Leitura B" });
    const third = await postJson(app, { text: "Leitura C" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.toString()).toContain("daily_limit_reached");
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects audio larger than the maximum before buffering it", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(new Uint8Array([1]), {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(8 * 1024 * 1024 + 1),
            },
          })
      )
    );

    const response = await postJson(createApp(), { text: "Texto de teste." });

    expect(response.status).toBe(502);
    expect(response.body.toString()).toContain("speech_generation_failed");
  });

  it("stops reading an oversized audio stream without Content-Length", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-only-provider-key");
    const oversizedAudio = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8 * 1024 * 1024));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(oversizedAudio, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" },
          })
      )
    );

    const response = await postJson(createApp(), { text: "Texto de teste." });

    expect(response.status).toBe(502);
    expect(response.body.toString()).toContain("speech_generation_failed");
  });

  it("does not call the provider when the protected key is unavailable", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const upstreamFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await postJson(createApp(), { text: "Texto de teste." });

    expect(response.status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
