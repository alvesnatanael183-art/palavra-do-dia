import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, ChevronRight, ExternalLink, Search, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { bookHref, getBooks, getChapter, textFromContent, type BibleBook } from "@/lib/bible";
import { isGithubPagesStatic, officialMessagesUrl } from "@/lib/deployment";

const quickReads = [
  { label: "Salmo 91", book: "PSA", chapter: 91 },
  { label: "Salmo 23", book: "PSA", chapter: 23 },
  { label: "João 3", book: "JHN", chapter: 3 },
  { label: "Romanos 8", book: "ROM", chapter: 8 },
];

const dailyReadings = [
  { bookId: "HEB", chapter: 11, verse: 1, reference: "HEBREUS 11:1", fallback: "Ora, a fé é a certeza daquilo que esperamos, a prova das coisas que não se veem.", reflection: "A fé bíblica firma a esperança no caráter de Deus e na sua Palavra, mesmo quando ainda não vemos o desfecho. Essa confiança é o tema central de A Fé É o Firme Fundamento: uma vida que aprende a caminhar sustentada pelo que Deus prometeu." },
  { bookId: "ROM", chapter: 10, verse: 17, reference: "ROMANOS 10:17", fallback: "Logo, a fé vem pelo ouvir, e o ouvir pela palavra de Deus.", reflection: "A fé se alimenta de ouvir a Palavra e deixá-la orientar as escolhas do cotidiano. A mensagem A Fé É o Firme Fundamento também aponta para essa confiança: não apenas conhecer as palavras, mas permitir que elas deem direção à vida." },
  { bookId: "MAT", chapter: 21, verse: 22, reference: "MATEUS 21:22", fallback: "E tudo o que pedirem em oração, crendo, vocês receberão.", reflection: "A oração cristã nasce da confiança em Deus e permanece orientada pela sua Palavra. Ao refletirmos sobre A Fé É o Firme Fundamento, lembramos que a esperança não é uma fórmula: é uma relação de confiança que conduz o coração a buscar a Deus." },
  { bookId: "JAS", chapter: 1, verse: 6, reference: "TIAGO 1:6", fallback: "Peça, porém, com fé, sem duvidar de nada.", reflection: "Quando a dúvida aparece, a Escritura convida a pedir sabedoria e a permanecer firmes em Deus. A mensagem A Fé É o Firme Fundamento trata dessa confiança como algo que sustenta a caminhada, inclusive nos dias em que as circunstâncias parecem instáveis." },
  { bookId: "PSA", chapter: 37, verse: 5, reference: "SALMOS 37:5", fallback: "Entregue o seu caminho ao SENHOR; confie também nele, e ele o fará.", reflection: "Entregar o caminho ao Senhor é confiar nele também durante o processo. A fé não apaga as dificuldades, mas dá esperança para seguir com fidelidade. Essa é uma leitura possível em diálogo com A Fé É o Firme Fundamento e com o convite do salmo a confiar em Deus." },
  { bookId: "HEB", chapter: 11, verse: 6, reference: "HEBREUS 11:6", fallback: "Sem fé é impossível agradar a Deus, pois aquele que se aproxima dele deve crer que ele existe e que recompensa os que o buscam.", reflection: "Buscar a Deus começa com confiança: crer que ele está presente e se aproximar dele com sinceridade. A mensagem A Fé É o Firme Fundamento retoma essa convicção e nos chama a fazer da fé uma postura diária, não apenas uma ideia." },
  { bookId: "2CO", chapter: 5, verse: 7, reference: "2 CORÍNTIOS 5:7", fallback: "Pois andamos por fé, não por vista.", reflection: "Nem sempre enxergamos o próximo passo, mas a fé nos ajuda a caminhar com esperança e responsabilidade. Em sintonia com A Fé É o Firme Fundamento, este texto lembra que confiar em Deus também significa continuar seguindo sua Palavra no presente." },
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
  const [prophetQuery, setProphetQuery] = useState("");
  const [prophetSearchError, setProphetSearchError] = useState("");
  const dailyReading = dailyReadings[new Date().getDay()];
  const [dailyVerseText, setDailyVerseText] = useState(dailyReading.fallback);

  useEffect(() => {
    getBooks().then(setBooks).catch(() => setBookError(true));
  }, []);

  useEffect(() => {
    let active = true;
    getChapter(dailyReading.bookId, dailyReading.chapter).then(({ chapter }) => {
      const verse = chapter.content.find((item) => item.type === "verse" && item.number === dailyReading.verse);
      if (active && verse) setDailyVerseText(textFromContent(verse));
    }).catch(() => { /* Mantém o texto de referência enquanto a API bíblica estiver indisponível. */ });
    return () => { active = false; };
  }, [dailyReading.bookId, dailyReading.chapter, dailyReading.verse]);

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
            <div className="eyebrow"><span className="eyebrow-dot" />SEMENTE CRE</div>
            <h1>A Fé É o Firme Fundamento</h1>
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
          <div className="section-heading"><span className="section-kicker"><Sparkles size={14} /> PARA HOJE</span><Link href={bookHref(dailyReading.bookId, dailyReading.chapter, dailyReading.verse)}>Ler capítulo <ArrowRight size={15} /></Link></div>
          <div className="daily-card">
            <div className="daily-mark" aria-hidden="true">“</div>
            <div className="daily-copy">
              <p>{dailyVerseText}</p>
              <Link href={bookHref(dailyReading.bookId, dailyReading.chapter, dailyReading.verse)} className="verse-reference">{dailyReading.reference} <span>·</span> BÍBLIA PORTUGUESA MUNDIAL</Link>
            </div>
            <div className="daily-aside"><span className="daily-date">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span><BookOpen size={26} strokeWidth={1.5} /></div>
          </div>
        </section>

        <section id="reflexao-diaria" className="daily-reflection-section page-width">
          <div className="section-heading"><span className="section-kicker">REFLEXÃO DO DIA</span><span className="reflection-alignment">Em diálogo com a mensagem</span></div>
          <article className="daily-reflection-card">
            <div className="reflection-label"><span>PALAVRA VIVA</span><span>·</span><span>REFLEXÃO ALINHADA A {dailyReading.reference}</span></div>
            <p>{dailyReading.reflection}</p>
            <div className="reflection-footer">
              <span>Texto editorial original; não é transcrição literal.</span>
              {isGithubPagesStatic ? (
                <a href={officialMessagesUrl} target="_blank" rel="noreferrer">
                  Mensagem relacionada: A Fé É o Firme Fundamento · 47-0412 <ExternalLink size={14} />
                </a>
              ) : (
                <Link href={`/mensagens?q=${encodeURIComponent("A Fé É o Firme Fundamento")}&tipo=frase`}>
                  Mensagem relacionada: A Fé É o Firme Fundamento · 47-0412 <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </article>
        </section>

        <section id="livros" className="books-section page-width">
          <div className="prophet-home-search">
            <div className="prophet-home-search-copy">
              <span className="section-kicker">MENSAGENS DO PROFETA</span>
              <p>{isGithubPagesStatic ? "A busca integrada não está disponível nesta versão estática. Pesquise no site oficial." : "Pesquise por livro bíblico, palavra ou frase nas mensagens de William Marrion Branham."}</p>
            </div>
            {isGithubPagesStatic ? (
              <div className="prophet-home-search-control">
                <a className="prophet-static-link" href={officialMessagesUrl} target="_blank" rel="noreferrer">
                  Pesquisar no The Table <ExternalLink size={15} />
                </a>
              </div>
            ) : (
              <div className="prophet-home-search-control">
                <form className="message-search-form prophet-home-search-form" role="search" aria-label="Pesquisar nas mensagens do profeta" onSubmit={submitProphetSearch}>
                  <Search size={19} className="message-search-icon" aria-hidden="true" />
                  <input type="search" list="prophet-message-book-list" maxLength={120} value={prophetQuery} onChange={(event) => { setProphetQuery(event.target.value); setProphetSearchError(""); }} placeholder="Ex.: Hebreus, Salmos, fé, oração…" aria-label="Livro, palavra ou frase para buscar nas mensagens do profeta" aria-invalid={Boolean(prophetSearchError)} aria-describedby={prophetSearchError ? "prophet-home-search-error" : undefined} />
                  <button className="message-search-submit" type="submit">Buscar <ArrowRight size={15} /></button>
                </form>
                <datalist id="prophet-message-book-list">{books.map((book) => <option key={book.id} value={book.name} />)}</datalist>
                {prophetSearchError && <p className="prophet-home-search-error" id="prophet-home-search-error" role="alert">{prophetSearchError}</p>}
              </div>
            )}
          </div>
          <div className="books-title-row">
            <div><span className="section-kicker">EXPLORE AS ESCRITURAS</span><p>Escolha um livro para começar sua leitura.</p></div>
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

        <section className="reading-callout page-width"><div className="callout-icon"><BookOpen size={23} /></div><div><span className="section-kicker">UM CAPÍTULO POR VEZ</span><h2>LER  OS LIVROS SAGRADOS</h2><p>As referências têm links próprios para você continuar de onde parou ou compartilhar um versículo.</p></div><Link className="callout-link" href={bookHref("JHN", 1)}>Começar a leitura <ArrowRight size={16} /></Link></section>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link href="/" className="brand footer-brand"><span className="brand-mark"><BookOpen size={18} /></span><span className="brand-name">Palavra <b>Viva</b></span></Link>
          <p>Texto bíblico: <a href="https://ebible.org/Scriptures/details.php?id=porbrbsl" target="_blank" rel="noreferrer">Bíblia Portuguesa Mundial</a> · Fonte: <a href="https://bible.helloao.org/docs/pt/" target="_blank" rel="noreferrer">API Bíblica de Uso Gratuito</a>.</p>
          <a href="#top" className="back-top" onClick={event => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Voltar ao topo ↑</a>
        </div>
      </footer>
      <div className="sr-only" id="top">Topo da página</div>
    </div>
  );
}
