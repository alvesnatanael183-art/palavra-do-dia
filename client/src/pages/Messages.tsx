import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import FullMessageReader from "@/components/FullMessageReader";
import MessageCatalog from "@/components/MessageCatalog";
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

type StaticIndexedMessage = ProphetFullMessage & {
  bookTitle: string;
  text: string;
};

function normalizeMessageSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function StaticMessagesPage() {
  const [messages, setMessages] = useState<StaticIndexedMessage[]>([]);
  const [query, setQuery] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
              new URL(`./data/messages-index/${part}`, window.location.href),
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

  const normalizedQuery = normalizeMessageSearch(query);
  const normalizedTitleFilter = normalizeMessageSearch(titleFilter);
  const normalizedCodeFilter = codeFilter.trim().toLocaleLowerCase("pt-BR");
  const filteredMessages = useMemo(() => {
    const titleWords = normalizedTitleFilter.split(/\s+/).filter(Boolean);
    return messages.filter(message => {
      const title = normalizeMessageSearch(message.title);
      const book = normalizeMessageSearch(message.bookTitle);
      const text = normalizeMessageSearch(message.text);
      const searchableText = `${book} ${title} ${message.dateCode} ${text}`;
      const generalMatch =
        !normalizedQuery || searchableText.includes(normalizedQuery);
      const titleMatch =
        titleWords.length === 0 ||
        titleWords.some(word => searchableText.includes(word));
      const codeMatch =
        !normalizedCodeFilter ||
        message.dateCode
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedCodeFilter);
      return generalMatch && titleMatch && codeMatch;
    });
  }, [messages, normalizedCodeFilter, normalizedQuery, normalizedTitleFilter]);

  const selectedMessage =
    messages.find(message => message.productId === selectedProductId) ?? null;
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
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca direta"
                >
                  ×
                </button>
              )}
            </div>
            <div className="static-message-filter-grid">
              <label className="message-catalog-search">
                <span className="sr-only">Filtrar por título e conteúdo</span>
                <input
                  type="search"
                  maxLength={120}
                  value={titleFilter}
                  onChange={event => setTitleFilter(event.target.value)}
                  placeholder="Título ou palavras…"
                  aria-label="Filtrar por título e todas as palavras do conteúdo"
                />
                {titleFilter && (
                  <button
                    type="button"
                    onClick={() => setTitleFilter("")}
                    aria-label="Limpar filtro de título"
                  >
                    ×
                  </button>
                )}
              </label>
              <label className="message-catalog-search">
                <span className="sr-only">Filtrar por código</span>
                <input
                  type="search"
                  maxLength={40}
                  value={codeFilter}
                  onChange={event => setCodeFilter(event.target.value)}
                  placeholder="Código…"
                  aria-label="Filtrar mensagens por código"
                />
                {codeFilter && (
                  <button
                    type="button"
                    onClick={() => setCodeFilter("")}
                    aria-label="Limpar filtro de código"
                  >
                    ×
                  </button>
                )}
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
              <ul className="message-catalog-list">
                {filteredMessages.map(message => (
                  <li key={message.productId}>
                    <button
                      type="button"
                      className={`message-catalog-item ${selectedProductId === message.productId ? "selected" : ""}`}
                      onClick={() => setSelectedProductId(message.productId)}
                      aria-pressed={selectedProductId === message.productId}
                    >
                      <span className="message-catalog-item-copy">
                        <strong>{message.title}</strong>
                        <small>
                          {message.bookTitle ? `${message.bookTitle} · ` : ""}
                          {message.dateCode}
                        </small>
                      </span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          <FullMessageReader
            message={selectedMessage}
            currentIndex={selectedIndex}
            totalMessages={filteredMessages.length}
            loading={loading}
            error={error}
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
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  if (!terms.length) return text;
  const escaped = terms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const matcher = new RegExp(`(${escaped.join("|")})`, "giu");
  return text
    .split(matcher)
    .map((part, index) =>
      index % 2 === 1 ? <mark key={`${index}-${part}`}>{part}</mark> : part
    );
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
                    {activeQuery ? `“${activeQuery}”` : "Trechos encontrados"}
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
