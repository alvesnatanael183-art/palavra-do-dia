import type { Express, Request, Response } from "express";

const OFFICIAL_SEARCH_URL = "https://table.branham.org/rest/userQuery";
const MAX_QUERY_LENGTH = 120;
const PAGE_SIZE = 25;
const MAX_PAGE_CACHE_BYTES = 8_192;

type JsonObject = Record<string, unknown>;

type ValidPageCache = {
  PageNumber: number;
  LastHit: { Doc: number; Fields: number; ShardIndex: number };
  TotalHits: number;
  TotalPages: number;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown, minimum = 0): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum ? value : null;
}

function validatePageCache(value: unknown): ValidPageCache | null | undefined {
  if (value === undefined || value === null) return null;
  if (!isObject(value)) return undefined;

  try {
    if (JSON.stringify(value).length > MAX_PAGE_CACHE_BYTES) return undefined;
  } catch {
    return undefined;
  }

  const lastHit = value.LastHit;
  if (!isObject(lastHit)) return undefined;
  const pageNumber = safeInteger(value.PageNumber, 1);
  const doc = safeInteger(lastHit.Doc);
  const fields = safeInteger(lastHit.Fields);
  const shardIndex = safeInteger(lastHit.ShardIndex);
  const totalHits = safeInteger(value.TotalHits);
  const totalPages = safeInteger(value.TotalPages);

  if ([pageNumber, doc, fields, shardIndex, totalHits, totalPages].some((item) => item === null)) {
    return undefined;
  }

  return {
    PageNumber: pageNumber!,
    LastHit: { Doc: doc!, Fields: fields!, ShardIndex: shardIndex! },
    TotalHits: totalHits!,
    TotalPages: totalPages!,
  };
}

function cleanSnippet(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, "\n\n")
    .trim()
    .slice(0, 1_600);
}

function getText(value: unknown, maximum = 180): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function registerSermonProxyRoutes(app: Express) {
  app.post("/api/messages/search", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");

    const body = req.body as JsonObject | undefined;
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const mode = body?.mode;
    const pageCache = validatePageCache(body?.previousPageCache);

    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
      res.status(400).json({ error: `Digite entre 2 e ${MAX_QUERY_LENGTH} caracteres para pesquisar.` });
      return;
    }
    if (mode !== "AllWords" && mode !== "ExactPhrase") {
      res.status(400).json({ error: "Escolha todas as palavras ou frase exata." });
      return;
    }
    if (pageCache === undefined) {
      res.status(400).json({ error: "A página de resultados expirou. Faça a busca novamente." });
      return;
    }

    const upstreamRequest: JsonObject = {
      Language: "pt",
      SearchType: mode,
      Text: query,
      PageSize: PAGE_SIZE,
    };
    if (pageCache) upstreamRequest.PreviousPageCache = pageCache;

    try {
      const upstream = await fetch(OFFICIAL_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://table.branham.org",
          Referer: "https://table.branham.org/",
        },
        body: JSON.stringify(upstreamRequest),
        signal: AbortSignal.timeout(20_000),
      });

      if (!upstream.ok) {
        res.status(502).json({ error: "A fonte oficial recusou a pesquisa. Tente novamente em instantes." });
        return;
      }

      const payload: unknown = await upstream.json();
      if (!isObject(payload) || payload.Status !== "Successful" || !isObject(payload.Result)) {
        res.status(502).json({ error: "A fonte oficial retornou uma resposta inesperada." });
        return;
      }

      const result = payload.Result;
      const rawHits = Array.isArray(result.Results) ? result.Results : [];
      const hits = rawHits.slice(0, PAGE_SIZE).filter(isObject).map((hit) => {
        const properties = isObject(hit.Properties) ? hit.Properties : {};
        return {
          id: getText(hit.RecordId, 80),
          sermonId: getText(hit.DocumentRecordId, 80),
          dateCode: getText(properties.DateCode, 40),
          title: getText(properties.Title),
          paragraphs: getText(properties.Paragraph, 100),
          snippet: cleanSnippet(properties.Fragment),
        };
      });

      const nextPageCache = validatePageCache(result.NextSearchCache);
      res.json({
        totalHits: safeInteger(result.TotalHits) ?? 0,
        currentPage: safeInteger(result.CurrentPage, 1) ?? 1,
        totalPages: safeInteger(result.TotalPages) ?? 0,
        results: hits,
        nextPageCache: nextPageCache ?? null,
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? "A pesquisa demorou mais que o esperado. Tente novamente."
          : "Não foi possível acessar as mensagens agora. Verifique sua conexão e tente novamente.",
      });
    }
  });
}
