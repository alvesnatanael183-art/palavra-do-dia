import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Copy, LoaderCircle, Search } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { bookHref, getBooks, getChapter, textFromContent, type BibleBook, type BibleChapter } from "@/lib/bible";

export default function Reader() {
  const params = useParams<{ book: string; chapter: string }>();
  const bookId = params.book?.toUpperCase() ?? "GEN";
  const chapterNumber = Number(params.chapter) || 1;
  const [, setLocation] = useLocation();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [highlightVerse, setHighlightVerse] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get("v")) || null);

  useEffect(() => {
    getBooks().then(setBooks).catch(() => setError("A lista de livros não pôde ser carregada."));
  }, []);

  useEffect(() => {
    const syncHighlightFromLocation = () => {
      setHighlightVerse(Number(new URLSearchParams(window.location.search).get("v")) || null);
    };
    window.addEventListener("popstate", syncHighlightFromLocation);
    window.addEventListener("hashchange", syncHighlightFromLocation);
    return () => {
      window.removeEventListener("popstate", syncHighlightFromLocation);
      window.removeEventListener("hashchange", syncHighlightFromLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setChapter(null);
    setHighlightVerse(Number(new URLSearchParams(window.location.search).get("v")) || null);
    Promise.all([getBooks(), getChapter(bookId, chapterNumber)]).then(([allBooks, result]) => {
      if (!active) return;
      setBooks(allBooks);
      const found = allBooks.find((item) => item.id === bookId);
      if (!found) throw new Error("Não encontramos esse livro.");
      if (chapterNumber < 1 || chapterNumber > found.numberOfChapters) throw new Error("Esse capítulo não existe nesse livro.");
      setBook(found);
      setChapter(result.chapter);
      localStorage.setItem("palavra-last-reading", JSON.stringify({ book: bookId, chapter: chapterNumber }));
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Não foi possível abrir este capítulo.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookId, chapterNumber]);

  useEffect(() => {
    if (!chapter || !highlightVerse) return;
    const timer = window.setTimeout(() => document.getElementById(`v${highlightVerse}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    return () => window.clearTimeout(timer);
  }, [chapter, highlightVerse]);

  const index = books.findIndex((item) => item.id === bookId);
  const previous = useMemo(() => {
    if (!book || !books.length) return null;
    if (chapterNumber > 1) return { book: book.id, chapter: chapterNumber - 1 };
    const priorBook = books[index - 1];
    return priorBook ? { book: priorBook.id, chapter: priorBook.numberOfChapters } : null;
  }, [book, books, chapterNumber, index]);
  const next = useMemo(() => {
    if (!book || !books.length) return null;
    if (chapterNumber < book.numberOfChapters) return { book: book.id, chapter: chapterNumber + 1 };
    const nextBook = books[index + 1];
    return nextBook ? { book: nextBook.id, chapter: 1 } : null;
  }, [book, books, chapterNumber, index]);

  async function copyReference() {
    if (!book) return;
    const reference = `${book.commonName || book.name} ${chapterNumber}${highlightVerse ? `:${highlightVerse}` : ""}`;
    try {
      await navigator.clipboard.writeText(`${reference} — ${window.location.href}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="site-shell reader-shell">
      <SiteHeader />
      <main className="reader-main page-width">
        <div className="reader-breadcrumb"><Link href="/">Início</Link><span>/</span><Link href="/">Bíblia</Link><span>/</span><span>{book?.name ?? "Leitura"}</span></div>
        <div className="reader-topline"><span className="section-kicker"><BookOpen size={14} /> LEITURA BÍBLICA</span><div className="reader-actions"><button type="button" onClick={copyReference} className="reader-action"><Copy size={16} /> {copied ? "Copiado" : "Copiar referência"}</button><Link href="/busca" className="reader-action"><Search size={16} /> Buscar</Link></div></div>

        <div className="reader-title-block">
          <div><h1>{book?.name ?? "Carregando leitura"}</h1><p>Leia no seu ritmo, capítulo por capítulo.</p></div>
          <div className="reader-selectors">
            <label className="select-wrap"><span className="sr-only">Livro</span><select aria-label="Selecionar livro" value={bookId} onChange={(event) => setLocation(bookHref(event.target.value, 1))}><option value={bookId}>{book?.name ?? "Livro"}</option>{books.filter((item) => item.id !== bookId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label>
            <label className="select-wrap chapter-select"><span className="sr-only">Capítulo</span><select aria-label="Selecionar capítulo" value={chapterNumber} onChange={(event) => setLocation(bookHref(bookId, Number(event.target.value)))}>{Array.from({ length: book?.numberOfChapters ?? Math.max(chapterNumber, 1) }, (_, i) => i + 1).map((number) => <option key={number} value={number}>Capítulo {number}</option>)}</select><ChevronDown size={15} /></label>
          </div>
        </div>

        <div className="chapter-toolbar"><div><span className="chapter-label">CAPÍTULO</span><strong>{String(chapterNumber).padStart(2, "0")}</strong><span className="toolbar-divider" /><span className="translation-label">BÍBLIA PORTUGUESA MUNDIAL</span></div><span className="chapter-progress">{book ? `${chapterNumber} de ${book.numberOfChapters}` : ""}</span></div>

        <article className="reading-paper" aria-live="polite">
          {loading && <div className="reader-loading"><LoaderCircle className="spin" size={22} /> Abrindo o capítulo...</div>}
          {!loading && error && <div className="reader-error"><strong>Não foi possível abrir esta leitura.</strong><p>{error}</p><button type="button" onClick={() => setLocation("/")}>Voltar ao início</button></div>}
          {!loading && !error && chapter && <div className="verses-list">{chapter.content.map((item, index) => {
            if (item.type === "line_break") return <div className="paragraph-gap" key={`gap-${index}`} />;
            if (item.type !== "verse" || !item.number) return null;
            const verseNumber = item.number;
            return (
              <p className={`verse-line ${highlightVerse === verseNumber ? "is-highlighted" : ""}`} id={`v${verseNumber}`} key={`${chapterNumber}-${verseNumber}`}>
                <Link className="verse-number" href={bookHref(bookId, chapterNumber, verseNumber)} aria-label={`Versículo ${verseNumber}`} onClick={() => setHighlightVerse(verseNumber)}>
                  {verseNumber}
                </Link>
                <span>{textFromContent(item)}</span>
              </p>
            );
          })}</div>}
          <div className="reader-source">Tradução: <a href="https://ebible.org/Scriptures/details.php?id=porbrbsl" target="_blank" rel="noreferrer">Bíblia Portuguesa Mundial</a> · Texto em domínio público.</div>
        </article>

        <div className="chapter-nav"><div>{previous ? <Link href={bookHref(previous.book, previous.chapter)} className="chapter-nav-button"><ArrowLeft size={17} /><span><small>CAPÍTULO ANTERIOR</small><b>{books.find((item) => item.id === previous.book)?.name} {previous.chapter}</b></span></Link> : <span className="chapter-nav-placeholder">Início da Bíblia</span>}</div><Link className="all-books-link" href="/"><BookOpen size={16} /> Todos os livros</Link><div className="next-nav-wrap">{next ? <Link href={bookHref(next.book, next.chapter)} className="chapter-nav-button next"><span><small>PRÓXIMO CAPÍTULO</small><b>{books.find((item) => item.id === next.book)?.name} {next.chapter}</b></span><ArrowRight size={17} /></Link> : <span className="chapter-nav-placeholder">Fim da Bíblia</span>}</div></div>
      </main>
      <footer className="site-footer reader-footer"><div className="footer-inner"><Link href="/" className="brand footer-brand"><span className="brand-mark"><BookOpen size={18} /></span><span className="brand-name">Palavra <b>Viva</b></span></Link><p>Fonte bíblica: <a href="https://bible.helloao.org/docs/pt/" target="_blank" rel="noreferrer">API Bíblica de Uso Gratuito</a>.</p><Link href="/" className="back-top">Voltar ao início</Link></div></footer>
    </div>
  );
}
