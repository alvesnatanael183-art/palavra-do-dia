import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, LoaderCircle, Search as SearchIcon, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { bookHref, findReference, getBooks, getSearchIndex, normalizeText, type BibleBook, type VerseRecord } from "@/lib/bible";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [activeQuery, setActiveQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [results, setResults] = useState<VerseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => { getBooks().then(setBooks).catch(() => setError("Não foi possível carregar as referências dos livros.")); }, []);

  useEffect(() => {
    const syncFromHistory = () => {
      const nextQuery = new URLSearchParams(window.location.search).get("q") ?? "";
      setQuery(nextQuery);
      setActiveQuery(nextQuery);
    };
    window.addEventListener("popstate", syncFromHistory);
    window.addEventListener("hashchange", syncFromHistory);
    return () => {
      window.removeEventListener("popstate", syncFromHistory);
      window.removeEventListener("hashchange", syncFromHistory);
    };
  }, []);

  useEffect(() => {
    const searchTerm = normalizeText(activeQuery);
    if (!searchTerm || searchTerm.length < 2 || !books.length) { setResults([]); setLoading(false); setError(""); return; }
    const reference = findReference(activeQuery, books);
    if (reference) {
      setResults([]);
      setLoading(false);
      setLocation(bookHref(reference.book.id, reference.chapter, reference.verse));
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);
    getSearchIndex((loaded, total) => { if (active) setProgress(Math.round((loaded / total) * 100)); })
      .then((index) => {
        if (!active) return;
        const matches = index.filter((verse) => normalizeText(verse.text).includes(searchTerm)).slice(0, 36);
        setResults(matches);
      })
      .catch(() => { if (active) setError("A busca não conseguiu carregar o texto completo. Verifique sua conexão e tente novamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeQuery, books, setLocation]);

  const resultLabel = useMemo(() => results.length === 36 ? "36 primeiros resultados" : `${results.length} resultado${results.length === 1 ? "" : "s"}`, [results.length]);

  function searchFor(value: string) {
    const clean = value.trim();
    setQuery(clean);
    setActiveQuery(clean);
    setLocation(clean ? `/busca?q=${encodeURIComponent(clean)}` : "/busca");
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    searchFor(query);
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="search-page page-width">
        <div className="reader-breadcrumb"><Link href="/">Início</Link><span>/</span><span>Busca na Bíblia</span></div>
        <div className="search-intro"><span className="section-kicker"><SearchIcon size={14} /> PESQUISE AS ESCRITURAS</span><h1>Encontre uma passagem.</h1><p>Busque por uma palavra, um trecho ou uma referência como “João 3:16”.</p></div>
        <form className="search-page-form" onSubmit={submitSearch}><SearchIcon size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você procura?" aria-label="Termo ou referência para buscar" /><button type="submit">Buscar <ArrowRight size={16} /></button></form>
        <div className="search-hints"><span>Experimente:</span>{["amor", "não temas", "João 3:16", "Salmo 23"].map((hint) => <button type="button" key={hint} onClick={() => searchFor(hint)}>{hint}</button>)}</div>
        <section className="results-section" aria-live="polite">
          {activeQuery && <div className="results-heading"><div><span className="section-kicker">RESULTADOS PARA</span><h2>“{activeQuery}”</h2></div>{!loading && !error && results.length > 0 && <span className="result-count">{resultLabel}</span>}</div>}
          {loading && <div className="search-loading"><LoaderCircle className="spin" size={22} /><div><strong>Procurando em toda a Bíblia...</strong><span>Carregando o texto integral{progress > 0 ? ` · ${progress}%` : ""}</span><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div></div>}
          {error && <div className="search-error"><p>{error}</p><button onClick={() => { const value = activeQuery; setActiveQuery(""); window.setTimeout(() => setActiveQuery(value), 0); }}>Tentar novamente</button></div>}
          {!loading && !error && activeQuery && results.length === 0 && normalizeText(activeQuery).length >= 2 && <div className="no-results"><div className="empty-icon"><BookOpen size={22} /></div><h3>Nenhum versículo encontrado</h3><p>Tente outra palavra ou procure por uma referência bíblica.</p></div>}
          {!loading && results.length > 0 && <div className="results-list">{results.map((result) => <Link key={`${result.bookId}-${result.chapter}-${result.verse}`} href={bookHref(result.bookId, result.chapter, result.verse)} className="result-card"><span className="result-icon"><BookOpen size={17} /></span><div className="result-copy"><strong>{result.bookName} {result.chapter}:{result.verse}</strong><p>{result.text}</p></div><ArrowRight size={17} className="result-arrow" /></Link>)}</div>}
          {!activeQuery && <div className="search-empty-state"><Sparkles size={20} /><p>Digite uma palavra ou referência para começar sua busca.</p></div>}
          {!loading && results.length >= 36 && <p className="results-limit">Mostrando até 36 resultados. Seja mais específico para refinar a busca.</p>}
        </section>
        <p className="search-source">Busca em <a href="https://ebible.org/Scriptures/details.php?id=porbrbsl" target="_blank" rel="noreferrer">Bíblia Portuguesa Mundial</a>, texto em domínio público.</p>
      </main>
      <footer className="site-footer"><div className="footer-inner"><Link href="/" className="brand footer-brand"><span className="brand-mark"><BookOpen size={18} /></span><span className="brand-name">Palavra <b>Viva</b></span></Link><p>Uma leitura de cada vez.</p><Link href="/" className="back-top">Voltar ao início</Link></div></footer>
    </div>
  );
}
