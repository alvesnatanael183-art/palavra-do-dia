import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  LoaderCircle,
  Printer,
  Search,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import FullMessageReader from "@/components/FullMessageReader";
import MessageCatalog from "@/components/MessageCatalog";
import { highlightText } from "@/components/SearchHighlight";
import { isGithubPagesStatic } from "@/lib/deployment";
import {
  getProphetMessageCatalog,
  readProphetMessage,
  searchProphetMessages,
  type ProphetFullMessage,
  type ProphetMessageCatalogItem,
  type ProphetMessageHit,
  type ProphetSearchMode,
} from "@/lib/prophetMessages";

const HISTORY_KEY = "palavra-prophet-search-history";
const suggestions = ["fé", "oração", "amor", "Palavra de Deus"];
const titleCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});
const officialUrl = "https://table.branham.org/#/pt/main";

type StaticIndexedMessage = {
  productId: number;
  dateCode: string;
  title: string;
  bookTitle: string;
  wordCounts: Record<string, number>;
};

type StaticMessageText = {
  productId: number;
  sections?: Array<{ text?: string }>;
};

function normalizeMessageSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function countWordOccurrences(
  textOrCounts: string | Record<string, number>,
  query: string
) {
  const words = normalizeMessageSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const counts =
    typeof textOrCounts === "string"
      ? normalizeMessageSearch(textOrCounts)
          .split(/\s+/)
          .filter(Boolean)
          .reduce<Record<string, number>>((result, token) => {
            result[token] = (result[token] ?? 0) + 1;
            return result;
          }, {})
      : textOrCounts;
  return words.reduce(
    (total, word) =>
      total +
      Object.entries(counts).reduce((sum, [token, count]) => {
        if (token === word) return sum + count;
        if (word.length >= 4 && Math.abs(token.length - word.length) <= 1) {
          let differences = 0;
          const size = Math.max(token.length, word.length);
          for (let index = 0; index < size; index += 1) {
            if (token[index] !== word[index]) differences += 1;
          }
          if (differences <= 1) return sum + count;
        }
        return sum;
      }, 0),
    0
  );
}

function extractStaticSnippet(message: StaticMessageText, query: string) {
  const terms = normalizeMessageSearch(query).split(/\s+/).filter(Boolean);
  const section = (message.sections ?? []).find(item => {
    const text = normalizeMessageSearch(item.text ?? "");
    return terms.some(term => text.includes(term));
  });
  const text = section?.text?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return "";
  if (text.length <= 320) return text;
  const normalizedText = normalizeMessageSearch(text);
  const matchIndex = terms
    .map(term => normalizedText.indexOf(term))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, matchIndex - 100);
  const prefix = start > 0 ? "…" : "";
  return `${prefix}${text.slice(start, start + 320).trim()}…`;
}

function StaticMessagesPage() {
  const [messages, setMessages] = useState<StaticIndexedMessage[]>([]);
  const [query, setQuery] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [activeTitleFilter, setActiveTitleFilter] = useState("");
  const [snippetByProductId, setSnippetByProductId] = useState<Record<number, string>>({});
  const [snippetLoading, setSnippetLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullMessage, setFullMessage] = useState<ProphetFullMessage | null>(
    null
  );
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState("");
  const [readerNightMode, setReaderNightMode] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState(16);

  const loadIndex = () => {
    setLoading(true);
    setError("");
    const manifestUrl = new URL(
      "./data/messages-search-manifest.json",
      window.location.href
    );
    fetch(manifestUrl, { cache: "no-store" })
      .then(response => {
        if (!response.ok)
          throw new Error("Não foi possível carregar o índice das mensagens.");
        return response.json() as Promise<{ parts: string[] }>;
      })
      .then(manifest =>
        Promise.all(
          (manifest.parts ?? []).map(part =>
            fetch(
              new URL(`./data/messages-search/${part}`, window.location.href),
              { cache: "no-store" }
            ).then(response => {
              if (!response.ok)
                throw new Error("Uma parte do índice não pôde ser carregada.");
              return response.json() as Promise<{
                messages: StaticIndexedMessage[];
              }>;
            })
          )
        )
      )
      .then(chunks => {
        setMessages(
          chunks.flatMap(chunk =>
            Array.isArray(chunk.messages) ? chunk.messages : []
          )
        );
      })
      .catch(reason => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as mensagens."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIndex();
  }, []);

  useEffect(() => {
    if (selectedProductId === null) {
      setFullMessage(null);
      return;
    }
    setFullLoading(true);
    setFullError("");
    fetch(
      new URL(
        `./data/messages-full/${selectedProductId}.json`,
        window.location.href
      ),
      { cache: "force-cache" }
    )
      .then(response => {
        if (!response.ok)
          throw new Error("Não foi possível abrir a mensagem integral.");
        return response.json() as Promise<ProphetFullMessage>;
      })
      .then(setFullMessage)
      .catch(reason =>
        setFullError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir a mensagem integral."
        )
      )
      .finally(() => setFullLoading(false));
  }, [selectedProductId]);

  const normalizedQuery = normalizeMessageSearch(query);
  const normalizedTitleFilter = normalizeMessageSearch(activeTitleFilter);
  const normalizedCategoryFilter = normalizeMessageSearch(activeCategoryFilter);
  const categories = useMemo(
    () =>
      [
        ...new Set(messages.map(message => message.bookTitle).filter(Boolean)),
      ].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [messages]
  );
  const filteredMessages = useMemo(() => {
    const titleWords = normalizedTitleFilter.split(/\s+/).filter(Boolean);
    return messages
      .map(message => ({
        message,
        occurrences: countWordOccurrences(
          message.wordCounts,
          activeTitleFilter
        ),
      }))
      .filter(({ message }) => {
        const title = normalizeMessageSearch(message.title);
        const book = normalizeMessageSearch(message.bookTitle);
        const searchableText = `${book} ${title} ${message.dateCode} ${Object.keys(message.wordCounts).join(" ")}`;
        const generalMatch =
          !normalizedQuery || searchableText.includes(normalizedQuery);
        const titleMatch =
          titleWords.length === 0 ||
          titleWords.some(
            word =>
              countWordOccurrences(message.wordCounts, word) > 0 ||
              searchableText.includes(word)
          );
        const categoryMatch =
          !normalizedCategoryFilter ||
          normalizeMessageSearch(message.bookTitle).includes(
            normalizedCategoryFilter
          );
        return generalMatch && titleMatch && categoryMatch;
      })
      .sort(
        (left, right) =>
          right.occurrences - left.occurrences ||
          left.message.title.localeCompare(right.message.title, "pt-BR")
      )
      .map(({ message }) => message);
  }, [
    messages,
    normalizedCategoryFilter,
    normalizedQuery,
    normalizedTitleFilter,
  ]);

  useEffect(() => {
    const searchText = activeTitleFilter.trim() || query.trim();
    if (!searchText || loading || error || filteredMessages.length === 0) {
      setSnippetByProductId({});
      setSnippetLoading(false);
      return;
    }
    let active = true;
    setSnippetLoading(true);
    const visibleMessages = filteredMessages.slice(0, 36);
    Promise.all(
      visibleMessages.map(async message => {
        try {
          const response = await fetch(
            new URL(
              `./data/messages-full/${message.productId}.json`,
              window.location.href
            ),
            { cache: "force-cache" }
          );
          if (!response.ok) return [message.productId, ""] as const;
          const payload = (await response.json()) as StaticMessageText;
          return [message.productId, extractStaticSnippet(payload, searchText)] as const;
        } catch {
          return [message.productId, ""] as const;
        }
      })
    ).then(entries => {
      if (!active) return;
      setSnippetByProductId(Object.fromEntries(entries));
      setSnippetLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeTitleFilter, error, filteredMessages, loading, query]);

  const occurrenceTotal = useMemo(
    () =>
      filteredMessages.reduce(
        (total, message) =>
          total + countWordOccurrences(message.wordCounts, activeTitleFilter),
        0
      ),
    [filteredMessages, activeTitleFilter]
  );

  const selectedMessage = fullMessage;
  const selectedIndex = selectedMessage
    ? filteredMessages.findIndex(
        message => message.productId === selectedMessage.productId
      )
    : null;
  const suggestions = [
    "Gênesis",
    "Êxodo",
    "Salmos",
    "João",
    "Romanos",
    "Hebreus",
    "fé",
    "oração",
  ];

  function navigateMessage(offset: -1 | 1) {
    if (selectedIndex === null || selectedIndex < 0) return;
    const next = filteredMessages[selectedIndex + offset];
    if (next) setSelectedProductId(next.productId);
  }

  function submitTitleSearch() {
    setActiveTitleFilter(titleFilter.trim());
    setActiveCategoryFilter(categoryFilter.trim());
    setSelectedProductId(null);
  }

  function clearAllSearches() {
    setQuery("");
    setTitleFilter("");
    setActiveTitleFilter("");
    setCategoryFilter("");
    setActiveCategoryFilter("");
    setSelectedProductId(null);
  }

  function exportSearchText() {
    const lines = [
      "Palavra Viva — resultado da pesquisa de mensagens",
      `Pesquisa: ${activeTitleFilter || "Todas as mensagens"}`,
      `Livro/categoria: ${activeCategoryFilter || "Todos"}`,
      `Mensagens encontradas: ${filteredMessages.length}`,
      `Total de ocorrências: ${occurrenceTotal}`,
      "",
      ...filteredMessages.map((message, index) => {
        const occurrences = countWordOccurrences(
          message.wordCounts,
          activeTitleFilter
        );
        return `${index + 1}. ${message.title} — ${occurrences} ocorrência(s) — ${message.bookTitle || "Sem categoria"} — ${message.dateCode}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pesquisa-${normalizeMessageSearch(activeTitleFilter) || "mensagens"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSearchPdf() {
    const rows = filteredMessages
      .map(message => {
        const occurrences = countWordOccurrences(
          message.wordCounts,
          activeTitleFilter
        );
        return `<li><strong>${message.title}</strong> — ${occurrences} ocorrência(s) — ${message.bookTitle || "Sem categoria"} — ${message.dateCode}</li>`;
      })
      .join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pesquisa — Palavra Viva</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:32px;line-height:1.45}h1{font-size:22px}p{margin:6px 0}ol{padding-left:24px}li{margin:5px 0}@media print{body{margin:18mm}}</style></head><body><h1>Palavra Viva — resultado da pesquisa</h1><p><strong>Pesquisa:</strong> ${activeTitleFilter || "Todas as mensagens"}</p><p><strong>Livro/categoria:</strong> ${activeCategoryFilter || "Todos"}</p><p><strong>Mensagens encontradas:</strong> ${filteredMessages.length}</p><p><strong>Total de ocorrências:</strong> ${occurrenceTotal}</p><hr><ol>${rows}</ol></body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="messages-page page-width">
        <div className="reader-breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>Mensagens do profeta</span>
        </div>
        <div className="messages-page-intro">
          <span className="section-kicker">
            <Sparkles size={14} /> ARQUIVO DE MENSAGENS
          </span>
          <h1>Mensagens do profeta</h1>
          <p>
            Encontre um livro, pesquise todas as palavras das transcrições e
            abra a mensagem diretamente nesta página.
          </p>
        </div>
        <section
          className="message-workspace static-message-workspace"
          aria-live="polite"
        >
          <aside
            className="message-results-panel"
            aria-label="Busca direta de mensagens do profeta"
          >
            <div className="message-panel-heading">
              <div>
                <span className="section-kicker">BUSCA DIRETA</span>
                <h2>Livros e mensagens</h2>
              </div>
              <span className="message-count">
                {loading
                  ? "Carregando…"
                  : `${filteredMessages.length.toLocaleString("pt-BR")} de ${messages.length.toLocaleString("pt-BR")}`}
              </span>
            </div>
            <div className="message-catalog-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                maxLength={120}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Digite o nome do livro ou uma palavra…"
                aria-label="Pesquisar livro, nome ou palavra dentro das mensagens"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearAllSearches}
                  aria-label="Limpar todas as pesquisas"
                >
                  ×
                </button>
              )}
            </div>
            <div className="static-message-filter-grid">
              <div className="static-message-filter-action">
                <label className="message-catalog-search">
                  <span className="sr-only">Filtrar por título e conteúdo</span>
                  <input
                    type="search"
                    maxLength={120}
                    value={titleFilter}
                    onChange={event => setTitleFilter(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") submitTitleSearch();
                    }}
                    placeholder="Buscar capítulo, tema ou trecho…"
                    aria-label="Buscar capítulo, tema ou trecho nas mensagens do profeta"
                  />
                  {titleFilter && (
                    <button
                      type="button"
                      onClick={clearAllSearches}
                      aria-label="Limpar todas as pesquisas"
                    >
                      ×
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  onClick={submitTitleSearch}
                  className="static-message-search-button"
                >
                  Pesquisar <ArrowRight size={14} />
                </button>
              </div>
              <label className="message-catalog-search">
                <span className="sr-only">Filtrar por livro ou categoria</span>
                <select
                  value={categoryFilter}
                  onChange={event => setCategoryFilter(event.target.value)}
                  aria-label="Filtrar mensagens por livro ou categoria"
                >
                  <option value="">Todos os livros/categorias</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="message-discovery-row static-message-suggestions">
              <span>Exemplos</span>
              {suggestions.map(item => (
                <button key={item} type="button" onClick={() => setQuery(item)}>
                  {item}
                </button>
              ))}
            </div>
            {loading && (
              <div className="message-loading">
                <LoaderCircle size={21} className="spin" />
                <span>Carregando índice completo…</span>
              </div>
            )}
            {!loading && error && (
              <div className="message-feedback">
                <strong>Não foi possível abrir o índice.</strong>
                <p>{error}</p>
                <button type="button" onClick={loadIndex}>
                  Tentar novamente
                </button>
              </div>
            )}
            {!loading && !error && filteredMessages.length === 0 && (
              <div className="message-catalog-empty" role="status">
                <strong>Nenhuma mensagem encontrada.</strong>
                <p>
                  O filtro de título procura todas as palavras dentro das
                  transcrições.
                </p>
              </div>
            )}
            {!loading && !error && filteredMessages.length > 0 && (
              <>
                <ul className="message-catalog-list">
                  {filteredMessages.map(message => (
                    <li key={message.productId}>
                      <button
                        type="button"
                        className={`message-catalog-item ${selectedProductId === message.productId ? "selected" : ""} ${activeTitleFilter && countWordOccurrences(message.wordCounts, activeTitleFilter) > 0 ? "has-search-match" : ""}`}
                        onClick={() => setSelectedProductId(message.productId)}
                        aria-pressed={selectedProductId === message.productId}
                      >
                        <span className="message-catalog-item-copy">
                          <strong>{message.title}</strong>
                          <small>
                            {activeTitleFilter &&
                            countWordOccurrences(
                              message.wordCounts,
                              activeTitleFilter
                            ) > 0
                              ? `${countWordOccurrences(message.wordCounts, activeTitleFilter)} ocorrência(s) · `
                              : ""}
                            {message.bookTitle ? `${message.bookTitle} · ` : ""}
                            {message.dateCode}
                          </small>
                          {snippetByProductId[message.productId] ? (
                            <span className="message-catalog-item-snippet">
                              {highlightSnippet(
                                snippetByProductId[message.productId],
                                activeTitleFilter || query
                              )}
                            </span>
                          ) : snippetLoading && (activeTitleFilter || query) ? (
                            <span className="message-catalog-item-snippet is-loading">
                              Procurando o trecho…
                            </span>
                          ) : null}
                        </span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="message-results-footer">
                  <strong>
                    Total de ocorrências:{" "}
                    {occurrenceTotal.toLocaleString("pt-BR")}
                  </strong>
                  <span>
                    {filteredMessages.length.toLocaleString("pt-BR")}{" "}
                    mensagem(ns) encontrada(s)
                  </span>
                  <div className="message-export-actions">
                    <button type="button" onClick={exportSearchText}>
                      <Download size={14} /> Exportar TXT
                    </button>
                    <button type="button" onClick={exportSearchPdf}>
                      <Printer size={14} /> Exportar PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
          <FullMessageReader
            message={selectedMessage}
            currentIndex={selectedIndex}
            totalMessages={filteredMessages.length}
            loading={loading || fullLoading}
            error={error || fullError}
            highlightQuery={activeTitleFilter.trim() || query.trim()}
            nightMode={readerNightMode}
            fontSize={readerFontSize}
            onToggleNightMode={() => setReaderNightMode(value => !value)}
            onFontSizeChange={setReaderFontSize}
            onNavigate={navigateMessage}
            onRetry={loadIndex}
          />
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark">
              <BookOpen size={18} />
            </span>
            <span className="brand-name">
              Palavra <b>Viva</b>
            </span>
          </Link>
          <p>
            Fonte das mensagens:{" "}
            <a href={officialUrl} target="_blank" rel="noreferrer">
              The Table · Voice of God Recordings
            </a>
            .
          </p>
          <Link href="/" className="back-top">
            Voltar ao início
          </Link>
        </div>
      </footer>
    </div>
  );
}

function readHistory(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(HISTORY_KEY) ?? "[]"
    );
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function highlightSnippet(text: string, query: string) {
  return highlightText(text, query);
}

function rememberSearch(value: string, current: string[]) {
  const next = [
    value.trim(),
    ...current.filter(
      item =>
        item.toLocaleLowerCase("pt-BR") !==
        value.trim().toLocaleLowerCase("pt-BR")
    ),
  ].slice(0, 5);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* Busca continua disponível sem armazenamento local. */
  }
  return next;
}

function friendlyError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

function IntegratedMessages() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [mode, setMode] = useState<ProphetSearchMode>(
    params.get("tipo") === "frase" ? "ExactPhrase" : "AllWords"
  );
  const [results, setResults] = useState<ProphetMessageHit[]>([]);
  const [selected, setSelected] = useState<ProphetMessageHit | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [nextPageCache, setNextPageCache] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>(readHistory);
  const [searchRun, setSearchRun] = useState(0);
  const searchVersion = useRef(0);
  const [copiedReference, setCopiedReference] = useState(false);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<ProphetMessageCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogSelectionIndex, setCatalogSelectionIndex] = useState<
    number | null
  >(null);
  const [fullMessage, setFullMessage] = useState<ProphetFullMessage | null>(
    null
  );
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState("");
  const [readerNightMode, setReaderNightMode] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState(16);
  const catalogLoadingRef = useRef(false);
  const fullRequestVersion = useRef(0);

  useEffect(() => {
    const syncFromHistory = () => {
      const nextParams = new URLSearchParams(window.location.search);
      const nextQuery = nextParams.get("q") ?? "";
      setQuery(nextQuery);
      setActiveQuery(nextQuery);
      setMode(nextParams.get("tipo") === "frase" ? "ExactPhrase" : "AllWords");
      setCatalogOpen(false);
      fullRequestVersion.current += 1;
      setFullLoading(false);
      searchVersion.current += 1;
      setSearchRun(value => value + 1);
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  useEffect(() => {
    if (activeQuery.trim().length < 2) {
      setResults([]);
      setSelected(null);
      setTotalHits(0);
      setNextPageCache(null);
      setLoading(false);
      setError("");
      return;
    }

    let current = true;
    setLoading(true);
    setError("");
    setLoadingMore(false);
    setResults([]);
    setSelected(null);
    setTotalHits(0);
    setNextPageCache(null);

    searchProphetMessages(activeQuery, mode)
      .then(page => {
        if (!current) return;
        setResults(page.results);
        setSelected(page.results[0] ?? null);
        setTotalHits(page.totalHits);
        setNextPageCache(page.nextPageCache);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            friendlyError(reason, "Não foi possível pesquisar as mensagens.")
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [activeQuery, mode, searchRun]);

  function closeCatalog() {
    setCatalogOpen(false);
    fullRequestVersion.current += 1;
    setFullLoading(false);
    setFullError("");
  }

  function searchFor(value: string, nextMode: ProphetSearchMode = mode) {
    const clean = value.trim();
    closeCatalog();
    setCatalogSelectionIndex(null);
    setFullMessage(null);
    setQuery(clean);
    setActiveQuery(clean);
    setMode(nextMode);
    searchVersion.current += 1;
    if (clean) setHistory(current => rememberSearch(clean, current));
    setSearchRun(current => current + 1);
    setLocation(
      clean
        ? `/mensagens?q=${encodeURIComponent(clean)}&tipo=${nextMode === "ExactPhrase" ? "frase" : "todas"}`
        : "/mensagens"
    );
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    searchFor(query);
  }

  async function loadCatalog() {
    setCatalogOpen(true);
    setCatalogError("");
    if (catalog.length > 0 || catalogLoadingRef.current) return;

    catalogLoadingRef.current = true;
    setCatalogLoading(true);
    try {
      const messages = await getProphetMessageCatalog();
      const sorted = [...messages].sort(
        (left, right) =>
          titleCollator.compare(left.title, right.title) ||
          left.dateCode.localeCompare(right.dateCode)
      );
      setCatalog(sorted);
      if (sorted.length === 0)
        setCatalogError("O índice ainda não possui mensagens em português.");
    } catch (reason) {
      setCatalogError(
        friendlyError(reason, "Não foi possível abrir o índice oficial.")
      );
    } finally {
      catalogLoadingRef.current = false;
      setCatalogLoading(false);
    }
  }

  function toggleCatalog() {
    if (catalogOpen) {
      closeCatalog();
      return;
    }
    void loadCatalog();
  }

  async function loadFullMessage(
    item: ProphetMessageCatalogItem,
    index: number
  ) {
    const requestVersion = fullRequestVersion.current + 1;
    fullRequestVersion.current = requestVersion;
    setCatalogSelectionIndex(index);
    setFullMessage(null);
    setFullError("");
    setFullLoading(true);
    try {
      const message = await readProphetMessage(item.productId);
      if (requestVersion === fullRequestVersion.current)
        setFullMessage(message);
    } catch (reason) {
      if (requestVersion === fullRequestVersion.current)
        setFullError(
          friendlyError(reason, "Não foi possível carregar o texto integral.")
        );
    } finally {
      if (requestVersion === fullRequestVersion.current) setFullLoading(false);
    }
  }

  function navigateCatalog(offset: -1 | 1) {
    if (catalogSelectionIndex === null) return;
    const nextIndex = catalogSelectionIndex + offset;
    const nextMessage = catalog[nextIndex];
    if (nextMessage) void loadFullMessage(nextMessage, nextIndex);
  }

  function retryFullMessage() {
    if (catalogSelectionIndex === null) return;
    const message = catalog[catalogSelectionIndex];
    if (message) void loadFullMessage(message, catalogSelectionIndex);
  }

  async function loadMore() {
    if (!nextPageCache || loadingMore || !activeQuery) return;
    const versionAtStart = searchVersion.current;
    const queryAtStart = activeQuery;
    const modeAtStart = mode;
    const cacheAtStart = nextPageCache;
    setLoadingMore(true);
    setError("");
    try {
      const page = await searchProphetMessages(
        queryAtStart,
        modeAtStart,
        cacheAtStart
      );
      if (versionAtStart !== searchVersion.current) return;
      setResults(current => [...current, ...page.results]);
      setNextPageCache(page.nextPageCache);
    } catch (reason) {
      if (versionAtStart === searchVersion.current)
        setError(
          friendlyError(reason, "Não foi possível carregar mais resultados.")
        );
    } finally {
      if (versionAtStart === searchVersion.current) setLoadingMore(false);
    }
  }

  async function copyMessageReference() {
    if (!selected) return;
    const reference = `${selected.dateCode} — ${selected.title}${selected.paragraphs ? ` · parágrafo(s) ${selected.paragraphs}` : ""}`;
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedReference(true);
      window.setTimeout(() => setCopiedReference(false), 1800);
    } catch {
      setCopiedReference(false);
    }
  }

  const selectedCatalogItem =
    catalogSelectionIndex === null
      ? null
      : (catalog[catalogSelectionIndex] ?? null);
  const selectedProductId = selectedCatalogItem?.productId ?? null;

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="messages-page page-width">
        <div className="reader-breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>Mensagens do profeta</span>
        </div>
        <div className="messages-page-intro">
          <span className="section-kicker">
            <Sparkles size={14} /> ARQUIVO DE MENSAGENS
          </span>
          <h1>Encontre um trecho.</h1>
          <p>
            Pesquise nas mensagens de William Marrion Branham e abra os
            resultados junto à leitura.
          </p>
        </div>

        <form className="message-search-form" onSubmit={submitSearch}>
          <Search size={19} className="message-search-icon" />
          <input
            maxLength={120}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Pesquise uma palavra ou frase…"
            aria-label="Pesquisar nas mensagens do profeta"
          />
          {query && (
            <button
              className="message-clear"
              type="button"
              onClick={() => searchFor("")}
              aria-label="Limpar pesquisa"
            >
              ×
            </button>
          )}
          <button className="message-search-submit" type="submit">
            Buscar <ArrowRight size={15} />
          </button>
        </form>

        <div className="message-search-options">
          <div
            className="message-mode-tabs"
            role="group"
            aria-label="Modos de pesquisa e leitura"
          >
            <button
              type="button"
              className={mode === "AllWords" ? "active" : ""}
              aria-pressed={mode === "AllWords"}
              onClick={() => {
                if (mode !== "AllWords" || catalogOpen)
                  searchFor(query, "AllWords");
              }}
            >
              Todas as palavras
            </button>
            <button
              type="button"
              className={mode === "ExactPhrase" ? "active" : ""}
              aria-pressed={mode === "ExactPhrase"}
              onClick={() => {
                if (mode !== "ExactPhrase" || catalogOpen)
                  searchFor(query, "ExactPhrase");
              }}
            >
              Frase exata
            </button>
            <button
              type="button"
              className={catalogOpen ? "active" : ""}
              aria-pressed={catalogOpen}
              onClick={toggleCatalog}
            >
              Abrir Livros
            </button>
          </div>
        </div>

        {!catalogOpen && !activeQuery && (
          <div className="message-discovery-row">
            <span>Buscas sugeridas</span>
            {suggestions.map(item => (
              <button key={item} type="button" onClick={() => searchFor(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
        {!catalogOpen && history.length > 0 && !activeQuery && (
          <div className="message-history-row">
            <span>Pesquisas recentes</span>
            {history.map(item => (
              <button key={item} type="button" onClick={() => searchFor(item)}>
                {item}
              </button>
            ))}
          </div>
        )}

        <section className="message-workspace" aria-live="polite">
          {catalogOpen ? (
            <MessageCatalog
              messages={catalog}
              selectedProductId={selectedProductId}
              loading={catalogLoading}
              error={catalogError}
              onSelect={(item, index) => {
                void loadFullMessage(item, index);
              }}
              onRetry={() => {
                void loadCatalog();
              }}
            />
          ) : (
            <aside
              className="message-results-panel"
              aria-label="Resultados da pesquisa"
            >
              <div className="message-panel-heading">
                <div>
                  <span className="section-kicker">RESULTADOS</span>
                  <h2>
                    {activeQuery ? <>“{highlightText(activeQuery, activeQuery)}”</> : "Trechos encontrados"}
                  </h2>
                </div>
                {activeQuery && !loading && (
                  <span className="message-count">
                    {totalHits.toLocaleString("pt-BR")} ocorrência
                    {totalHits === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {loading && (
                <div className="message-loading">
                  <LoaderCircle size={21} className="spin" />
                  <span>Pesquisando nas mensagens…</span>
                </div>
              )}
              {!loading && error && (
                <div className="message-feedback">
                  <strong>Não foi possível concluir a busca.</strong>
                  <p>{error}</p>
                  <button type="button" onClick={() => searchFor(activeQuery)}>
                    Tentar novamente
                  </button>
                </div>
              )}
              {!loading && !error && activeQuery.trim().length === 1 && (
                <div className="message-feedback">
                  <p>Digite pelo menos duas letras para iniciar a pesquisa.</p>
                </div>
              )}
              {!loading &&
                !error &&
                activeQuery.length >= 2 &&
                results.length === 0 && (
                  <div className="message-feedback">
                    <strong>Nenhum trecho encontrado.</strong>
                    <p>Tente outras palavras ou altere o tipo de pesquisa.</p>
                  </div>
                )}
              {!loading && !activeQuery && (
                <div className="message-empty">
                  <BookOpen size={23} />
                  <strong>Comece pela busca</strong>
                  <p>
                    Os resultados aparecem aqui e a passagem selecionada é
                    aberta ao lado.
                  </p>
                </div>
              )}
              {results.length > 0 && (
                <div className="message-results-list">
                  {results.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      className={`message-result-card ${selected?.id === item.id ? "selected" : ""}`}
                      onClick={() => setSelected(item)}
                      aria-pressed={selected?.id === item.id}
                    >
                      <span className="message-result-meta">
                        <b>{item.dateCode || "Mensagem"}</b>
                        <span>
                          {item.paragraphs ? `§ ${item.paragraphs}` : "Trecho"}
                        </span>
                      </span>
                      <strong>
                        {item.title || "Mensagem de William Marrion Branham"}
                      </strong>
                      <span className="message-result-snippet">
                        {highlightSnippet(item.snippet, activeQuery)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {nextPageCache && results.length > 0 && (
                <button
                  type="button"
                  className="message-load-more"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? (
                    <>
                      <LoaderCircle size={15} className="spin" /> Carregando…
                    </>
                  ) : (
                    "Mostrar mais resultados"
                  )}
                </button>
              )}
              {results.length > 0 && (
                <p className="message-page-note">
                  Mostrando {results.length.toLocaleString("pt-BR")} de{" "}
                  {totalHits.toLocaleString("pt-BR")} ocorrências.
                </p>
              )}
            </aside>
          )}

          {catalogOpen ? (
            <FullMessageReader
              message={fullMessage}
              currentIndex={catalogSelectionIndex}
              totalMessages={catalog.length}
              loading={fullLoading}
              error={fullError}
              highlightQuery={activeQuery}
              nightMode={readerNightMode}
              fontSize={readerFontSize}
              onToggleNightMode={() => setReaderNightMode(current => !current)}
              onFontSizeChange={setReaderFontSize}
              onNavigate={navigateCatalog}
              onRetry={retryFullMessage}
            />
          ) : (
            <article
              className="message-reading-panel"
              aria-label="Trecho selecionado"
            >
              {selected ? (
                <>
                  <div className="message-reader-heading">
                    <span className="section-kicker">
                      <BookOpen size={14} /> TRECHO SELECIONADO
                    </span>
                    <h2>
                      {selected.title || "Mensagem de William Marrion Branham"}
                    </h2>
                    <div className="message-reader-meta">
                      <span>{selected.dateCode || ""}</span>
                      {selected.paragraphs && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Parágrafo(s) {selected.paragraphs}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <blockquote className="message-excerpt">
                    {highlightSnippet(selected.snippet, activeQuery)}
                  </blockquote>
                  <div className="message-source-note">
                    <span>Fonte oficial</span>
                    <p>
                      Este é um trecho de contexto. Para ler mensagens integrais
                      em ordem alfabética, use “Abrir Livros”; a referência
                      oficial também está disponível abaixo.
                    </p>
                    <strong className="message-source-reference">
                      {selected.dateCode} — {selected.title}
                      {selected.paragraphs
                        ? ` · parágrafo(s) ${selected.paragraphs}`
                        : ""}
                    </strong>
                    <div className="message-source-actions">
                      <button type="button" onClick={copyMessageReference}>
                        {copiedReference
                          ? "Referência copiada"
                          : "Copiar referência"}
                      </button>
                      <a href={officialUrl} target="_blank" rel="noreferrer">
                        Abrir The Table <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="message-reader-empty">
                  <span className="message-reader-mark">
                    <BookOpen size={25} />
                  </span>
                  <span className="section-kicker">LEITURA DA MENSAGEM</span>
                  <h2>Escolha um resultado.</h2>
                  <p>
                    O trecho e sua referência serão apresentados neste painel
                    para facilitar a leitura e a conferência da fonte.
                  </p>
                </div>
              )}
            </article>
          )}
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark">
              <BookOpen size={18} />
            </span>
            <span className="brand-name">
              Palavra <b>Viva</b>
            </span>
          </Link>
          <p>
            Fonte das mensagens:{" "}
            <a href={officialUrl} target="_blank" rel="noreferrer">
              The Table · Voice of God Recordings
            </a>
            .
          </p>
          <Link href="/" className="back-top">
            Voltar ao início
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function Messages() {
  return isGithubPagesStatic ? <StaticMessagesPage /> : <IntegratedMessages />;
}
