import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, ChevronRight, Search, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { bookHref, getBooks, type BibleBook } from "@/lib/bible";

const quickReads = [
  { label: "Salmo 91", book: "PSA", chapter: 91 },
  { label: "Salmo 23", book: "PSA", chapter: 23 },
  { label: "João 3", book: "JHN", chapter: 3 },
  { label: "Romanos 8", book: "ROM", chapter: 8 },
];

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
  const [testament, setTestament] = useState<"Todos" | "Antigo" | "Novo">("Todos");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getBooks().then(setBooks).catch(() => setBookError(true));
  }, []);

  const visibleBooks = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase("pt-BR");
    return books.filter((book) => {
      const rightTestament = testament === "Todos" || (testament === "Antigo" ? book.order <= 39 : book.order > 39);
      return rightTestament && (!needle || book.name.toLocaleLowerCase("pt-BR").includes(needle));
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
    if (query.trim()) setLocation(`/busca?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> UM ESPAÇO PARA A PALAVRA</div>
            <h1>A Palavra de Deus<br /><em>sempre com você.</em></h1>
            <p className="hero-subtitle">Encontre uma passagem, explore as Escrituras e leia no seu ritmo.</p>
            <form className="hero-search" onSubmit={submitSearch}>
              <Search size={20} className="search-leading" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar capítulo, tema ou trecho" placeholder="Busque capítulo, tema ou trecho (ex.: amor)" />
              <button type="submit">Buscar <ArrowRight size={16} /></button>
            </form>
            <div className="quick-reads"><span>Leituras queridas:</span>{quickReads.map((item) => <Link key={item.label} href={bookHref(item.book, item.chapter)}>{item.label}</Link>)}</div>
          </div>
        </section>

        <section id="versiculo" className="daily-section page-width">
          <div className="section-heading"><span className="section-kicker"><Sparkles size={14} /> PARA HOJE</span><Link href={bookHref("PSA", 23, 1)}>Ler capítulo <ArrowRight size={15} /></Link></div>
          <div className="daily-card">
            <div className="daily-mark" aria-hidden="true">“</div>
            <div className="daily-copy">
              <p>O SENHOR é o meu pastor; nada me faltará.</p>
              <Link href={bookHref("PSA", 23, 1)} className="verse-reference">SALMOS 23:1 <span>·</span> BÍBLIA PORTUGUESA MUNDIAL</Link>
            </div>
            <div className="daily-aside"><span className="daily-date">LEITURA DO DIA</span><BookOpen size={26} strokeWidth={1.5} /></div>
          </div>
        </section>

        <section id="livros" className="books-section page-width">
          <div className="books-title-row">
            <div><span className="section-kicker">EXPLORE AS ESCRITURAS</span><h2>Livros da Bíblia</h2><p>Escolha um livro para começar sua leitura.</p></div>
            <div className="book-count"><strong>{books.length || "66"}</strong><span>livros</span></div>
          </div>
          <div className="book-controls">
            <div className="testament-tabs" role="tablist" aria-label="Filtrar por testamento">
              {(["Todos", "Antigo", "Novo"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={testament === item} className={testament === item ? "active" : ""} onClick={() => setTestament(item)}>{item}</button>)}
            </div>
            <label className="book-filter"><Search size={17} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Encontrar livro..." aria-label="Encontrar livro" />{filter && <button type="button" onClick={() => setFilter("")} aria-label="Limpar busca">×</button>}</label>
          </div>
          {bookError ? <div className="inline-message">Não foi possível carregar a lista de livros. <button onClick={() => { setBookError(false); getBooks().then(setBooks).catch(() => setBookError(true)); }}>Tentar novamente</button></div> : books.length === 0 ? <div className="books-loading"><span className="loading-dot" /> Preparando a lista de livros...</div> : visibleBooks.length === 0 ? <div className="empty-books">Nenhum livro encontrado. Tente outro nome.</div> : (
            <div className="book-groups">{groups.map(([label, entries]) => <section className="book-group" key={label}><div className="book-group-heading"><h3>{label}</h3><span>{entries.length.toString().padStart(2, "0")}</span></div><div className="book-grid">{entries.map((book) => <Link key={book.id} href={bookHref(book.id)} className="book-card"><span className="book-card-icon"><BookOpen size={17} strokeWidth={1.65} /></span><span className="book-card-name">{book.name}</span><span className="book-card-chapters">{book.numberOfChapters} cap.</span><ChevronRight size={15} className="book-card-arrow" /></Link>)}</div></section>)}</div>
          )}
          <div className="browse-note"><span>Uma leitura de cada vez.</span><Link href={bookHref("GEN", 1)}>Abrir Gênesis <ArrowRight size={15} /></Link></div>
        </section>

        <section className="reading-callout page-width"><div className="callout-icon"><BookOpen size={23} /></div><div><span className="section-kicker">UM CAPÍTULO POR VEZ</span><h2>Leia com calma. Volte quando quiser.</h2><p>As referências têm links próprios para você continuar de onde parou ou compartilhar um versículo.</p></div><Link className="callout-link" href={bookHref("JHN", 1)}>Começar a leitura <ArrowRight size={16} /></Link></section>
      </main>
      <footer className="site-footer"><div className="footer-inner"><Link href="/" className="brand footer-brand"><span className="brand-mark"><BookOpen size={18} /></span><span className="brand-name">Palavra <b>Viva</b></span></Link><p>Texto bíblico: <a href="https://ebible.org/Scriptures/details.php?id=porbrbsl" target="_blank" rel="noreferrer">Bíblia Portuguesa Mundial</a> · Fonte: <a href="https://bible.helloao.org/docs/pt/" target="_blank" rel="noreferrer">API Bíblica de Uso Gratuito</a>.</p><a href="#top" className="back-top">Voltar ao topo ↑</a></div></footer>
      <div className="sr-only" id="top">Topo da página</div>
    </div>
  );
}
