import type { Express, Request, Response } from "express";

const OFFICIAL_SEARCH_URL = "https://table.branham.org/rest/userQuery";
const OFFICIAL_CATALOG_URL = "https://table.branham.org/rest/index/allSermons";
const OFFICIAL_SERMON_URL =
  "https://table.branham.org/rest/sermons/sermonRequest";
const MAX_QUERY_LENGTH = 120;
const PAGE_SIZE = 25;
const MAX_PAGE_CACHE_BYTES = 8_192;
const MAX_CATALOG_ITEMS = 1_000;
const MAX_TRANSCRIPT_SECTIONS = 5_000;
const CATALOG_CACHE_MS = 5 * 60 * 1_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

type JsonObject = Record<string, unknown>;

type ValidPageCache = {
  PageNumber: number;
  LastHit: { Doc: number; Fields: number; ShardIndex: number };
  TotalHits: number;
  TotalPages: number;
};

type CatalogMessage = {
  productId: number;
  dateCode: string;
  title: string;
};

type TranscriptSection = {
  paragraph: string;
  text: string;
};

let catalogCache: { expiresAt: number; messages: CatalogMessage[] } | null =
  null;
const titleCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});
const officialHeaders = {
  "Content-Type": "application/json;charset=utf-8",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://table.branham.org",
  Referer: "https://table.branham.org/",
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown, minimum = 0): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum
    ? value
    : null;
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

  if (
    [pageNumber, doc, fields, shardIndex, totalHits, totalPages].some(
      item => item === null
    )
  ) {
    return undefined;
  }

  return {
    PageNumber: pageNumber!,
    LastHit: { Doc: doc!, Fields: fields!, ShardIndex: shardIndex! },
    TotalHits: totalHits!,
    TotalPages: totalPages!,
  };
}

function decodeDecimalEntity(_match: string, digits: string): string {
  const point = Number(digits);
  return Number.isSafeInteger(point) &&
    point >= 0 &&
    point <= 0x10ffff &&
    !(point >= 0xd800 && point <= 0xdfff)
    ? String.fromCodePoint(point)
    : "";
}

function decodeHexEntity(_match: string, digits: string): string {
  const point = Number.parseInt(digits, 16);
  return Number.isSafeInteger(point) &&
    point >= 0 &&
    point <= 0x10ffff &&
    !(point >= 0xd800 && point <= 0xdfff)
    ? String.fromCodePoint(point)
    : "";
}

function cleanHtmlText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, decodeDecimalEntity)
    .replace(/&#x([0-9a-f]+);/gi, decodeHexEntity)
    .replace(/\r/g, "")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanSnippet(value: unknown): string {
  return cleanHtmlText(value).slice(0, 1_600);
}

function getText(value: unknown, maximum = 180): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

async function postOfficialJson(
  url: string,
  body: JsonObject
): Promise<unknown> {
  const upstream = await fetch(url, {
    method: "POST",
    headers: officialHeaders,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!upstream.ok)
    throw new Error(`Official source returned HTTP ${upstream.status}`);
  return (await upstream.json()) as unknown;
}

async function getOfficialCatalog(): Promise<CatalogMessage[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now())
    return catalogCache.messages;

  const payload = await postOfficialJson(OFFICIAL_CATALOG_URL, {
    Language: "pt",
  });
  if (
    !isObject(payload) ||
    payload.Status !== "Successful" ||
    !isObject(payload.Result) ||
    !Array.isArray(payload.Result.Sermons)
  ) {
    throw new Error("Official catalog response is invalid");
  }

  const byProductId = new Map<number, CatalogMessage>();
  for (const record of payload.Result.Sermons.slice(0, MAX_CATALOG_ITEMS)) {
    if (!isObject(record)) continue;
    const productId = safeInteger(record.i, 1);
    const dateCode = getText(record.p, 40);
    const title = getText(record.t);
    if (productId === null || !dateCode || !title || byProductId.has(productId))
      continue;
    byProductId.set(productId, { productId, dateCode, title });
  }

  const messages = [...byProductId.values()].sort(
    (left, right) =>
      titleCollator.compare(left.title, right.title) ||
      left.dateCode.localeCompare(right.dateCode)
  );
  if (messages.length === 0) throw new Error("Official catalog is empty");

  catalogCache = { expiresAt: Date.now() + CATALOG_CACHE_MS, messages };
  return messages;
}

function upstreamErrorMessage(
  error: unknown,
  fallback: string
): { status: number; message: string } {
  const isTimeout = error instanceof Error && error.name === "TimeoutError";
  return {
    status: isTimeout ? 504 : 502,
    message: isTimeout
      ? "A fonte oficial demorou mais que o esperado. Tente novamente."
      : fallback,
  };
}

export function registerSermonProxyRoutes(app: Express) {
  app.post("/api/messages/search", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");

    const body = req.body as JsonObject | undefined;
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const mode = body?.mode;
    const pageCache = validatePageCache(body?.previousPageCache);

    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
      res
        .status(400)
        .json({
          error: `Digite entre 2 e ${MAX_QUERY_LENGTH} caracteres para pesquisar.`,
        });
      return;
    }
    if (mode !== "AllWords" && mode !== "ExactPhrase") {
      res
        .status(400)
        .json({ error: "Escolha todas as palavras ou frase exata." });
      return;
    }
    if (pageCache === undefined) {
      res
        .status(400)
        .json({
          error: "A página de resultados expirou. Faça a busca novamente.",
        });
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
      const payload = await postOfficialJson(
        OFFICIAL_SEARCH_URL,
        upstreamRequest
      );
      if (
        !isObject(payload) ||
        payload.Status !== "Successful" ||
        !isObject(payload.Result)
      ) {
        res
          .status(502)
          .json({ error: "A fonte oficial retornou uma resposta inesperada." });
        return;
      }

      const result = payload.Result;
      const rawHits = Array.isArray(result.Results) ? result.Results : [];
      const hits = rawHits
        .slice(0, PAGE_SIZE)
        .filter(isObject)
        .map(hit => {
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
      const failure = upstreamErrorMessage(
        error,
        "Não foi possível acessar as mensagens agora. Verifique sua conexão e tente novamente."
      );
      res.status(failure.status).json({ error: failure.message });
    }
  });

  app.get("/api/messages/catalog", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const messages = await getOfficialCatalog();
      res.json({ messages });
    } catch (error) {
      const failure = upstreamErrorMessage(
        error,
        "Não foi possível abrir o índice oficial de mensagens agora."
      );
      res.status(failure.status).json({ error: failure.message });
    }
  });

  app.post("/api/messages/read", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const body = req.body as JsonObject | undefined;
    const productId = safeInteger(body?.productId, 1);
    if (productId === null) {
      res
        .status(400)
        .json({ error: "Selecione uma mensagem válida do índice." });
      return;
    }

    try {
      const catalog = await getOfficialCatalog();
      const metadata = catalog.find(item => item.productId === productId);
      if (!metadata) {
        res
          .status(404)
          .json({ error: "Essa mensagem não está no índice em português." });
        return;
      }

      const payload = await postOfficialJson(OFFICIAL_SERMON_URL, {
        Language: "pt",
        SermonProductIdentityId: productId,
        GetAllContent: true,
      });
      if (
        !isObject(payload) ||
        payload.Status !== "Successful" ||
        !isObject(payload.Result) ||
        !Array.isArray(payload.Result.Sections)
      ) {
        res
          .status(502)
          .json({
            error:
              "A fonte oficial não conseguiu abrir essa mensagem integral.",
          });
        return;
      }

      const rawSections = payload.Result.Sections.slice(
        0,
        MAX_TRANSCRIPT_SECTIONS
      ).filter(isObject);
      const sections: TranscriptSection[] = rawSections
        .map(section => {
          const paragraph =
            typeof section.Paragraph === "number"
              ? String(section.Paragraph)
              : getText(section.Paragraph, 60);
          return { paragraph, text: cleanHtmlText(section.Content) };
        })
        .filter(
          section =>
            section.paragraph.toLocaleLowerCase("pt-BR") !== "header" &&
            section.text.length > 0
        );

      if (sections.length === 0) {
        res
          .status(502)
          .json({
            error:
              "A fonte oficial não retornou parágrafos legíveis para essa mensagem.",
          });
        return;
      }

      res.json({
        productId,
        dateCode: getText(payload.Result.DateCode, 40) || metadata.dateCode,
        title: getText(payload.Result.Title) || metadata.title,
        sections,
      });
    } catch (error) {
      const failure = upstreamErrorMessage(
        error,
        "Não foi possível carregar o texto integral agora. Tente novamente."
      );
      res.status(failure.status).json({ error: failure.message });
    }
  });
}
