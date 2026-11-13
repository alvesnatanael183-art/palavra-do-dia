const API_ROOT = "https://bible.helloao.org/api/por_bsl";

export type BibleBook = {
  id: string;
  name: string;
  commonName: string;
  shortName: string;
  order: number;
  numberOfChapters: number;
  totalNumberOfVerses?: number;
};

export type BibleContentItem = {
  type: string;
  number?: number;
  text?: string;
  content?: Array<string | { noteId?: number; text?: string; poem?: number }>;
  paragraph?: string;
};

export type BibleChapter = {
  number: number;
  content: BibleContentItem[];
};

export type VerseRecord = {
  bookId: string;
  bookName: string;
  bookOrder: number;
  chapter: number;
  verse: number;
  text: string;
};

type BooksResponse = { books: BibleBook[] };
type ChapterResponse = { book: BibleBook; chapter: BibleChapter };
type CompleteResponse = {
  books: Array<{
    id: string;
    name: string;
    order: number;
    chapters: Array<{
      chapter: {
        number: number;
        content: Array<{ type: string; number?: number; text?: string }>;
      };
    }>;
  }>;
};

let booksRequest: Promise<BibleBook[]> | undefined;
let searchIndexRequest: Promise<VerseRecord[]> | undefined;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar o texto bíblico agora.");
  return response.json() as Promise<T>;
}

export function getBooks(): Promise<BibleBook[]> {
  if (!booksRequest) {
    booksRequest = getJson<BooksResponse>(`${API_ROOT}/books.json`)
      .then(({ books }) => books.filter((book) => book.order <= 66).sort((a, b) => a.order - b.order))
      .catch((error) => {
        booksRequest = undefined;
        throw error;
      });
  }
  return booksRequest;
}

export async function getChapter(bookId: string, chapter: number): Promise<ChapterResponse> {
  return getJson<ChapterResponse>(`${API_ROOT}/${encodeURIComponent(bookId)}/${chapter}.json`);
}

export function textFromContent(item: BibleContentItem): string {
  if (typeof item.text === "string") return item.text;
  if (Array.isArray(item.content)) {
    const poetic = item.content.some((part) => typeof part === "object" && "poem" in part);
    return item.content.map((part) => typeof part === "string" ? part : part.text ?? "").join(poetic ? "\n" : "");
  }
  return "";
}

export function getSearchIndex(onProgress?: (loaded: number, total: number) => void): Promise<VerseRecord[]> {
  if (!searchIndexRequest) {
    searchIndexRequest = getJson<CompleteResponse>(`${API_ROOT}/complete.simple.json`)
      .then(({ books }) => {
        const canonicalBooks = books.filter((book) => book.order <= 66).sort((a, b) => a.order - b.order);
        const total = canonicalBooks.reduce((sum, book) => sum + book.chapters.length, 0);
        let loaded = 0;
        const records: VerseRecord[] = [];
        for (const book of canonicalBooks) {
          for (const entry of book.chapters) {
            const chapter = entry.chapter;
            for (const item of chapter.content) {
              if (item.type === "verse" && item.number && item.text) {
                records.push({
                  bookId: book.id,
                  bookName: book.name,
                  bookOrder: book.order,
                  chapter: chapter.number,
                  verse: item.number,
                  text: item.text,
                });
              }
            }
            loaded += 1;
            if (loaded % 40 === 0) onProgress?.(loaded, total);
          }
        }
        onProgress?.(total, total);
        return records;
      })
      .catch((error) => {
        searchIndexRequest = undefined;
        throw error;
      });
  }
  return searchIndexRequest;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9:.]+/g, " ")
    .trim();
}

export function findReference(query: string, books: BibleBook[]): { book: BibleBook; chapter: number; verse?: number } | null {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;
  const candidates = [...books].sort((a, b) => normalizeText(b.commonName || b.name).length - normalizeText(a.commonName || a.name).length);
  for (const book of candidates) {
    const names = [book.commonName, book.name, book.shortName, ...(book.id === "PSA" ? ["Salmo"] : [])]
      .filter(Boolean)
      .map(normalizeText)
      .sort((a, b) => b.length - a.length);
    const matchedName = names.find((name) => normalizedQuery === name || normalizedQuery.startsWith(`${name} `));
    if (!matchedName) continue;
    const tail = normalizedQuery.slice(matchedName.length).trim();
    if (!tail) return { book, chapter: 1 };
    const match = tail.match(/^(\d+)(?:\s*[:.]\s*(\d+))?$/);
    if (!match) continue;
    const chapter = Number(match[1]);
    const verse = match[2] ? Number(match[2]) : undefined;
    if (chapter >= 1 && chapter <= book.numberOfChapters && (!verse || verse > 0)) {
      return { book, chapter, verse };
    }
  }
  return null;
}

export function bookHref(bookId: string, chapter = 1, verse?: number): string {
  const base = `/leitura/${encodeURIComponent(bookId)}/${chapter}`;
  return verse ? `${base}?v=${verse}` : base;
}
