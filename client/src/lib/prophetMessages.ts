export type ProphetSearchMode = "AllWords" | "ExactPhrase";

export type ProphetMessageHit = {
  id: string;
  sermonId: string;
  dateCode: string;
  title: string;
  paragraphs: string;
  snippet: string;
};

export type ProphetSearchPage = {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  results: ProphetMessageHit[];
  nextPageCache: Record<string, unknown> | null;
};

export type ProphetMessageCatalogItem = {
  productId: number;
  dateCode: string;
  title: string;
};

export type ProphetTranscriptSection = {
  paragraph: string;
  text: string;
};

export type ProphetFullMessage = {
  productId: number;
  dateCode: string;
  title: string;
  sections: ProphetTranscriptSection[];
};

type ApiError = { error?: string };

async function readJson<T>(response: Response): Promise<T & ApiError> {
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok)
    throw new Error(
      payload.error || "Não foi possível acessar as mensagens agora."
    );
  return payload;
}

export async function searchProphetMessages(
  query: string,
  mode: ProphetSearchMode,
  previousPageCache?: Record<string, unknown> | null
): Promise<ProphetSearchPage> {
  const response = await fetch("/api/messages/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      mode,
      previousPageCache: previousPageCache ?? null,
    }),
  });
  return await readJson<ProphetSearchPage>(response);
}

export async function getProphetMessageCatalog(): Promise<
  ProphetMessageCatalogItem[]
> {
  const response = await fetch("/api/messages/catalog", {
    method: "GET",
    cache: "no-store",
  });
  const payload = await readJson<{ messages: ProphetMessageCatalogItem[] }>(
    response
  );
  return payload.messages;
}

export async function readProphetMessage(
  productId: number
): Promise<ProphetFullMessage> {
  const response = await fetch("/api/messages/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ productId }),
  });
  return await readJson<ProphetFullMessage>(response);
}
