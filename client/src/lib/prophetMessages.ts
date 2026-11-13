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

export async function searchProphetMessages(
  query: string,
  mode: ProphetSearchMode,
  previousPageCache?: Record<string, unknown> | null,
): Promise<ProphetSearchPage> {
  const response = await fetch("/api/messages/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode, previousPageCache: previousPageCache ?? null }),
  });

  const payload = await response.json().catch(() => ({})) as ProphetSearchPage & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "A pesquisa de mensagens não está disponível agora.");
  }
  return payload;
}
