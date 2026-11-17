import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Search,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import ShareCopyActions from "@/components/ShareCopyActions";
import DailyPlanner from "@/components/DailyPlanner";
import {
  bookHref,
  getBooks,
  getChapter,
  textFromContent,
  type BibleBook,
} from "@/lib/bible";
import { isGithubPagesStatic, officialMessagesUrl } from "@/lib/deployment";
import {
  getDailyProphetMessage,
  getDailyScheduleEntry,
} from "@/lib/dailyContent";

const quickReads = [
  { label: "Salmo 91", book: "PSA", chapter: 91 },
  { label: "Salmo 23", book: "PSA", chapter: 23 },
  { label: "João 3", book: "JHN", chapter: 3 },
  { label: "Romanos 8", book: "ROM", chapter: 8 },
];

const relationshipStopWords = new Set(
  "a ao aos as de da das do dos e em na nas no nos o os para por que um uma é ser se com como não mais seu sua seus suas aquele aquela ele ela eles elas isso isto este esta pelo pela sobre quem quando onde ou foi são tem".split(
    " "
  )
);

function findRelatedProphetParagraph(
  sections: { text?: string }[] | undefined,
  verseText: string
) {
  const normalizeWords = (text: string) =>
    text
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z]{4,}/g)
      ?.filter(word => !relationshipStopWords.has(word)) ?? [];
  const verseWords = new Set(normalizeWords(verseText));
  const candidates = (sections ?? [])
    .map(section => section.text?.trim() ?? "")
    .filter(Boolean);
  if (!candidates.length) return "";

  const ranked = candidates.map((text, index) => ({
    text,
    score: normalizeWords(text).reduce(
      (total, word) => total + (verseWords.has(word) ? 1 : 0),
      0
    ),
    index,
  }));
  ranked.sort(
    (left, right) => right.score - left.score || left.index - right.index
  );
  const related = ranked[0].text;
  return related.length > 520 ? `${related.slice(0, 520).trim()}…` : related;
}

function sectionFor(order: number) {
  if (order <= 5) return "Pentateuco";
  if (order <= 17) return "Livros históricos";
  if (order <= 22) return "Poéticos e sabedoria";
  if (order <= 27) return "Profetas maiores";
  if (order <= 39) return "Profetas menores";
  if (order <= 44) return "Evangelhos e Atos";
  if (order <= 57) return "Epístolas paulinas";
  return "Epístolas gerais e Apocalipse";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [bookError, setBookError] = useState(false);
  const [filter, setFilter] = useState("");
  const [testament, setTestament] = useState<"Todos" | "Antigo" | "Novo">(
    "Todos"
  );
  const [query, setQuery] = useState("");
  const [prophetQuery, setProphetQuery] = useState("");
  const [prophetSearchError, setProphetSearchError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const scheduledReading = getDailyScheduleEntry(selectedDate);
  const dailyReading = {
    ...scheduledReading,
    fallback: scheduledReading.text,
  };
  const dailyProphet = getDailyProphetMessage(selectedDate);
  const [dailyVerseText, setDailyVerseText] = useState(dailyReading.fallback);
  const [dailyProphetExcerpt, setDailyProphetExcerpt] = useState("");

  useEffect(() => {
    getBooks()
      .then(setBooks)
      .catch(() => setBookError(true));
  }, []);

  useEffect(() => {
    let active = true;
    setDailyVerseText(dailyReading.fallback);
    getChapter(dailyReading.bookId, dailyReading.chapter)
      .then(({ chapter }) => {
        const verse = chapter.content.find(
          item => item.type === "verse" && item.number === dailyReading.verse
        );
        if (active && verse) setDailyVerseText(textFromContent(verse));
      })
      .catch(() => {
        /* Mantém o texto de referência enquanto a API bíblica estiver indisponível. */
      });
    return () => {
      active = false;
    };
  }, [dailyReading.bookId, dailyReading.chapter, dailyReading.verse]);

  useEffect(() => {
    let active = true;
    setDailyProphetExcerpt("");
    fetch(`./data/messages-full/${dailyProphet.productId}.json`, {
      cache: "no-store",
    })
      .then(response => {
        if (!response.ok) throw new Error("Mensagem diária indisponível");
        return response.json() as Promise<{ sections?: { text?: string }[] }>;
      })
      .then(message => {
        const excerpt = findRelatedProphetParagraph(
          message.sections,
          dailyVerseText
        );
        if (active) setDailyProphetExcerpt(excerpt);
      })
      .catch(() => {
        if (active)
          setDailyProphetExcerpt(
            "Leia a mensagem completa para acompanhar esta Palavra Viva."
          );
      });
    return () => {
      active = false;
    };
  }, [dailyProphet.productId, dailyVerseText]);

  const visibleBooks = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase("pt-BR");
    return books.filter(book => {
      const rightTestament =
        testament === "Todos" ||
        (testament === "Antigo" ? book.order <= 39 : book.order > 39);
      return (
        rightTestament &&
        (!needle || book.name.toLocaleLowerCase("pt-BR").includes(needle))
      );
    });
  }, [books, filter, testament]);

  const groups = useMemo(() => {
    const map = new Map<string, BibleBook[]>();
    for (const book of visibleBooks) {
      const label = sectionFor(book.order);
      map.set(label, [...(map.get(label) ?? []), book]);
    }
    return [...map.entries()];
  }, [visibleBooks]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim())
      setLocation(`/busca?q=${encodeURIComponent(query.trim())}`);
  }

  function submitProphetSearch(event: FormEvent) {
    event.preventDefault();
    const clean = prophetQuery.trim();
    if (clean.length < 2) {
      setProphetSearchError("Digite pelo menos duas letras para pesquisar.");
      return;
    }
    setProphetSearchError("");
    setLocation(`/mensagens?q=${encodeURIComponent(clean)}&tipo=todas`);
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              SEMENTE CRE
            </div>
            <h1>A Fé É o Firme Fundamento</h1>
            <p className="hero-subtitle">
              Encontre uma passagem, explore as Escrituras e leia no seu ritmo.
            </p>
            <form className="hero-search" onSubmit={submitSearch}>
              <Search size={20} className="search-leading" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                aria-label="Buscar capítulo, tema ou trecho"
                placeholder="Busque capítulo, tema ou trecho (ex.: amor)"
              />
              <button type="submit">
                Buscar <ArrowRight size={16} />
              </button>
            </form>
            <div className="quick-reads">
              <span>Leituras queridas:</span>
              {quickReads.map(item => (
                <Link key={item.label} href={bookHref(item.book, item.chapter)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="versiculo" className="daily-section page-width">
          <div className="section-heading">
            <span className="section-kicker">
              <Sparkles size={14} /> PARA HOJE
            </span>
            <div className="daily-section-actions">
              <Link
                href={bookHref(
                  dailyReading.bookId,
                  dailyReading.chapter,
                  dailyReading.verse
                )}
              >
                Ler capítulo <ArrowRight size={15} />
              </Link>
              <DailyPlanner
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                verseReference={dailyReading.reference}
                verseText={dailyVerseText}
                reflection={dailyReading.reflection}
                prophetCode={dailyProphet.dateCode}
                prophetTitle={dailyProphet.title}
                prophetExcerpt={dailyProphetExcerpt}
              />
            </div>
          </div>
          <div className="daily-card">
            <div className="daily-mark" aria-hidden="true">
              “
            </div>
            <div className="daily-copy">
              <p>{dailyVerseText}</p>
              <Link
                href={bookHref(
                  dailyReading.bookId,
                  dailyReading.chapter,
                  dailyReading.verse
                )}
                className="verse-reference"
              >
                {dailyReading.reference} <span>·</span> BÍBLIA PORTUGUESA
                MUNDIAL
              </Link>
              <ShareCopyActions
                text={dailyVerseText}
                label="o versículo de hoje"
              />
            </div>
            <div className="daily-aside">
              <span className="daily-date">
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <BookOpen size={26} strokeWidth={1.5} />
            </div>
          </div>
        </section>

        <section
          id="reflexao-diaria"
          className="daily-reflection-section page-width"
        >
          <div className="section-heading">
            <span className="section-kicker">REFLEXÃO DO DIA</span>
            <span className="reflection-alignment">
              Em diálogo com a mensagem
            </span>
          </div>
          <article className="daily-reflection-card">
            <div className="reflection-label">
              <span>PALAVRA VIVA</span>
              <span>·</span>
              <span>REFLEXÃO ALINHADA A {dailyReading.reference}</span>
            </div>
            <p>{dailyReading.reflection}</p>
            <ShareCopyActions
              text={dailyReading.reflection}
              label="a reflexão do dia"
            />
            <div className="reflection-footer">
              <span>Texto editorial original; não é transcrição literal.</span>
            </div>
          </article>
          <article className="daily-prophet-card">
            <div className="reflection-label">
              <span>TRECHO RELACIONADO AO VERSÍCULO · MENSAGEM DO PROFETA</span>
              <span>·</span>
              <span>
                {dailyProphet.title} · {dailyProphet.dateCode}
              </span>
            </div>
            <p>{dailyProphetExcerpt || "Carregando a mensagem do dia…"}</p>
            <ShareCopyActions
              text={dailyProphetExcerpt}
              label="o trecho relacionado da mensagem do profeta"
            />
            <div className="reflection-footer">
              <span>Parágrafo da mensagem de William Marrion Branham.</span>
              {isGithubPagesStatic ? (
                <a href={officialMessagesUrl} target="_blank" rel="noreferrer">
                  Abrir mensagem completa <ExternalLink size={14} />
                </a>
              ) : (
                <Link
                  href={`/mensagens?q=${encodeURIComponent(dailyProphet.title)}&tipo=frase`}
                >
                  Abrir mensagem completa <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </article>
        </section>

        <section id="livros" className="books-section page-width">
          <div className="prophet-home-search">
            <div className="prophet-home-search-copy">
              <span className="section-kicker">MENSAGENS DO PROFETA</span>
              <p>
                Pesquise por capítulo, tema, palavra ou trecho nas mensagens de William Marrion Branham.
              </p>
            </div>
            <div className="prophet-home-search-control">
                <form
                  className="message-search-form prophet-home-search-form"
                  role="search"
                  aria-label="Pesquisar nas mensagens do profeta"
                  onSubmit={submitProphetSearch}
                >
                  <Search
                    size={19}
                    className="message-search-icon"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    list="prophet-message-book-list"
                    maxLength={120}
                    value={prophetQuery}
                    onChange={event => {
                      setProphetQuery(event.target.value);
                      setProphetSearchError("");
                    }}
                    placeholder="Buscar capítulo, tema ou trecho…"
                    aria-label="Buscar capítulo, tema ou trecho nas mensagens do profeta"
                    aria-invalid={Boolean(prophetSearchError)}
                    aria-describedby={
                      prophetSearchError
                        ? "prophet-home-search-error"
                        : undefined
                    }
                  />
                  <button className="message-search-submit" type="submit">
                    Buscar <ArrowRight size={15} />
                  </button>
                </form>
                {!isGithubPagesStatic && (
                  <datalist id="prophet-message-book-list">
                    {books.map(book => (
                      <option key={book.id} value={book.name} />
                    ))}
                  </datalist>
                )}
                {prophetSearchError && (
                  <p
                    className="prophet-home-search-error"
                    id="prophet-home-search-error"
                    role="alert"
                  >
                    {prophetSearchError}
                  </p>
                )}
              </div>
          </div>
          <div className="books-title-row">
            <div>
              <span className="section-kicker">EXPLORE AS ESCRITURAS</span>
              <p>Escolha um livro para começar sua leitura.</p>
            </div>
            <div className="book-count">
              <strong>{books.length || "66"}</strong>
              <span>livros</span>
            </div>
          </div>
          <div className="book-controls">
            <div
              className="testament-tabs"
              role="tablist"
              aria-label="Filtrar por testamento"
            >
              {(["Todos", "Antigo", "Novo"] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={testament === item}
                  className={testament === item ? "active" : ""}
                  onClick={() => setTestament(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="book-filter">
              <Search size={17} />
              <input
                value={filter}
                onChange={event => setFilter(event.target.value)}
                placeholder="Encontrar livro..."
                aria-label="Encontrar livro"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              )}
            </label>
          </div>
          {bookError ? (
            <div className="inline-message">
              Não foi possível carregar a lista de livros.{" "}
              <button
                onClick={() => {
                  setBookError(false);
                  getBooks()
                    .then(setBooks)
                    .catch(() => setBookError(true));
                }}
              >
                Tentar novamente
              </button>
            </div>
          ) : books.length === 0 ? (
            <div className="books-loading">
              <span className="loading-dot" /> Preparando a lista de livros...
            </div>
          ) : visibleBooks.length === 0 ? (
            <div className="empty-books">
              Nenhum livro encontrado. Tente outro nome.
            </div>
          ) : (
            <div className="book-groups">
              {groups.map(([label, entries]) => (
                <section className="book-group" key={label}>
                  <div className="book-group-heading">
                    <h3>{label}</h3>
                    <span>{entries.length.toString().padStart(2, "0")}</span>
                  </div>
                  <div className="book-grid">
                    {entries.map(book => (
                      <Link
                        key={book.id}
                        href={bookHref(book.id)}
                        className="book-card"
                      >
                        <span className="book-card-icon">
                          <BookOpen size={17} strokeWidth={1.65} />
                        </span>
                        <span className="book-card-name">{book.name}</span>
                        <span className="book-card-chapters">
                          {book.numberOfChapters} cap.
                        </span>
                        <ChevronRight size={15} className="book-card-arrow" />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <div className="browse-note">
            <span>Uma leitura de cada vez.</span>
            <Link href={bookHref("GEN", 1)}>
              Abrir Gênesis <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <section className="reading-callout page-width">
          <div className="callout-icon">
            <BookOpen size={23} />
          </div>
          <div>
            <span className="section-kicker">UM CAPÍTULO POR VEZ</span>
            <h2>LER OS LIVROS SAGRADOS</h2>
            <p>
              As referências têm links próprios para você continuar de onde
              parou ou compartilhar um versículo.
            </p>
          </div>
          <Link className="callout-link" href={bookHref("JHN", 1)}>
            Começar a leitura <ArrowRight size={16} />
          </Link>
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
            Texto bíblico:{" "}
            <a
              href="https://ebible.org/Scriptures/details.php?id=porbrbsl"
              target="_blank"
              rel="noreferrer"
            >
              Bíblia Portuguesa Mundial
            </a>{" "}
            · Fonte:{" "}
            <a
              href="https://bible.helloao.org/docs/pt/"
              target="_blank"
              rel="noreferrer"
            >
              API Bíblica de Uso Gratuito
            </a>
            .
          </p>
          <a
            href="#top"
            className="back-top"
            onClick={event => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Voltar ao topo ↑
          </a>
        </div>
      </footer>
      <div className="sr-only" id="top">
        Topo da página
      </div>
    </div>
  );
}
