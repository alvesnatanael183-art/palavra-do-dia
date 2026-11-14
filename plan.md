# Plano de atualização — Palavra Viva

## Objetivo e decisões de implementação

Ampliar o site existente com a busca e leitura de mensagens do profeta William Marrion Branham, inspirada no The Table, mantendo o parágrafo devocional diário alinhado ao versículo do dia. Preservar o leitor bíblico, a busca atual, o tema visual e a navegação já existentes.

A página `/mensagens` manterá a busca por todas as palavras ou frase exata, com contagem, snippets, paginação e destaque dos termos. Ao lado desses modos haverá o botão “Abrir Livros”. Ao acioná-lo, a lista de mensagens em português será carregada do índice oficial, ordenada alfabeticamente pelo título e exibida no painel de resultados. Ao selecionar uma mensagem, o painel de leitura buscará a transcrição integral sob demanda. Controles anterior/próxima seguirão a mesma ordem alfabética, permitindo ler a sequência inteira. O usuário confirmou possuir autorização/licença para exibir as transcrições integrais no Palavra Viva. As transcrições serão mantidas apenas no estado da página durante a leitura; não haverá cópia em massa nem persistência em banco de dados ou armazenamento local.

A integração usará uma rota controlada no Express para consultar o índice português de mensagens e buscar o conteúdo da mensagem selecionada pelo identificador de produto. O servidor validará o identificador contra o índice oficial, retornará texto extraído de conteúdo HTML sem inserir HTML remoto na página e usará respostas `no-store`. O acesso ao conteúdo permanece do lado do servidor para evitar chamadas cross-origin e não haverá iframe. O botão de fonte oficial continua disponível.

Na página inicial, manter o parágrafo de reflexão original imediatamente abaixo do versículo diário, com referência a mensagem relacionada e link para pesquisá-la. A passagem bíblica e a reflexão devem tratar do mesmo tema; a escolha diária é determinística pela data local. A reflexão é editorial, não transcrição literal.

Não criar banco de dados. Reutilizar o Express, Vite, Dockerfile e script de build existentes: gerar o frontend estático com `pnpm build` dentro do contêiner e servi-lo no mesmo processo Express que responde à pesquisa, ao catálogo e à leitura em `/api/*`. As rotas de página permanecem atendidas pelo fallback SPA do contêiner. Manter recursos e rotas anteriores.

## Estrutura do projeto

- `client/src/pages/Messages.tsx`: pesquisa, modos todas as palavras/frase exata, botão “Abrir Livros”, índice A–Z, leitura integral selecionada e navegação anterior/próxima.
- `client/src/lib/prophetMessages.ts`: tipos e chamadas frontend para pesquisa, catálogo e mensagem integral.
- `client/src/pages/Home.tsx`: versículo do dia e reflexão relacionada, na ordem solicitada.
- `client/src/components/SiteHeader.tsx` e `client/src/App.tsx`: navegação e rota já existente para Mensagens.
- `server/_core/sermonProxy.ts` e `server/_core/index.ts`: validação e proxy limitado aos endpoints oficiais de busca, índice e conteúdo; validação do identificador e conversão segura do texto.
- `client/public/manus-routes.json`: declaração sincronizada das rotas públicas.
- `client/src/index.css`: estilos editoriais azul e papel, responsivos e acessíveis.
- `TODO.md`: critérios completos e status das entregas, preservando o histórico concluído.

## Design

Reutilizar o estilo editorial sereno do Palavra Viva: fundos claros, tipografia serifada nos textos de leitura, azul discreto para navegação e destaque, cartões leves e uma divisão de painéis que se empilha no celular. No catálogo, manter uma lista A–Z escaneável; no leitor, priorizar título, código da mensagem, texto integral e controles anterior/próxima.

## Evidências de referência

O guia oficial descreve busca por todas as palavras e frase exata, paginação e abertura de resultado com destaque dos termos: [Guia de pesquisa do The Table](https://support.branham.org/en/thetableapp/android/10132021_TheAndroidTable_Search). A interface pública portuguesa foi examinada em [The Table](https://table.branham.org/#/pt/main). O cliente público usa `POST /rest/userQuery`, `POST /rest/index/allSermons` e `POST /rest/sermons/sermonRequest`. Uma consulta ao índice português retornou a lista de metadados das mensagens; o endpoint de conteúdo aceitou `SermonProductIdentityId` e devolveu todas as seções de uma mensagem selecionada. A URL do The Table não serializa a consulta nem o sermão selecionado; por isso, o app fará a leitura integral no painel próprio apenas após a escolha no índice e manterá o link para a fonte oficial.


## Adendo — versão estática no GitHub Pages

O projeto continuará mantendo a versão React/Express usada no Manus. O build destinado ao GitHub Pages será separado e condicionado a `VITE_GITHUB_PAGES_STATIC=true`; somente essa versão terá base de assets relativa `./`, navegação por hash e tratamento visual para a ausência do backend. A base relativa permite servir a mesma compilação tanto no endereço de projeto `/palavra-do-dia/` quanto na raiz de um domínio personalizado. Assim, a busca/catálogo/leitura integral das mensagens continuam disponíveis na versão com Express, mas o GitHub Pages não invocará a integração/API de mensagens do projeto: exibirá a limitação com um link claro para o The Table oficial. A leitura bíblica, a busca bíblica e a reflexão diária permanecem disponíveis e usam a API bíblica pública já integrada.

O build estático é gerado em `dist/public`; a branch dedicada `gh-pages` recebe os arquivos compilados e `.nojekyll`, e a origem do Pages permanece configurada para `gh-pages` / raiz. O roteamento por hash evita 404 de SPA em caminhos como leitura, busca e mensagens, sem depender de fallback no host. O `base` relativo do Vite e o favicon/configuração pública permitem que os assets carreguem no subdiretório `/palavra-do-dia/` e na raiz de um domínio personalizado.

A publicação está ativa em `https://alvesnatanael183-art.github.io/palavra-do-dia/`, configurada para a branch `gh-pages` / raiz; a compilação do Pages foi concluída e o site respondeu nas rotas de início, leitura, busca e mensagens. Após autorização explícita, o repositório inteiro `alvesnatanael183-art/palavra-do-dia` foi tornado público, e o proprietário confirmou os efeitos informados pelo GitHub: código e histórico visíveis, forks permitidos, regras de push desativadas, alteração visível na atividade e histórico/logs do Actions públicos. A credencial GitHub conectada não podia configurar Pages (403); a alteração foi aplicada pelo navegador autenticado do proprietário. A publicação automática Manus continua desativada, então o push para `main` não republica a versão Manus.

### Estrutura relevante para esta entrega

- `vite.config.ts`: aplicar `./` apenas no modo GitHub Pages e manter `/` na versão Express.
- `package.json`: fornecer comando reproduzível `build:github-pages`, que gera `dist/public`.
- `client/src/App.tsx`: selecionar o hook de hash do Wouter no modo estático, preservando o roteamento normal no modo Express.
- `client/src/lib/deployment.ts`: concentrar o indicador do modo Pages, o link à fonte oficial e um formatador que produz `/<repositório>/?consulta#/rota`; `Search.tsx` e `Reader.tsx` leem a consulta em `window.location.search` e sincronizam o estado em mudanças de hash.
- `client/src/pages/Home.tsx` e `client/src/pages/Messages.tsx`: substituir entradas de busca integrada do profeta por aviso/link oficial somente no build estático.
- `client/index.html` e `client/public/.nojekyll`: usar o `%BASE_URL%` relativo e evitar processamento Jekyll dos arquivos publicados.
- `TODO.md`: acompanhar, sem alterar os critérios já concluídos do site com servidor.

### Fontes oficiais consultadas

O GitHub Pages hospeda HTML, CSS e JavaScript de um repositório e sites de projeto usam o caminho `/<repositório>/`: [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). A publicação por branch pode usar a raiz ou `/docs`, publica mudanças enviadas à branch escolhida e o site é público mesmo com repositório privado quando o plano/organização permite; o próprio GitHub executa um workflow de implantação do Pages: [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).


## Adendo — automação do build e deploy via GitHub Actions

O workflow `.github/workflows/deploy-pages.yml` será acionado em pushes para `main` e poderá ser iniciado manualmente por `workflow_dispatch`. Ele instala Node.js 22 e pnpm 10.18.0, instala dependências pelo lockfile, executa `pnpm build:github-pages` e publica os arquivos web necessários de `dist/public` na raiz da branch `gh-pages`, omitindo `__manus__/`, `manus-routes.json` e `.gitkeep`. A origem do Pages continua `gh-pages` / raiz; a branch recebe commits normais, sem force-push. A publicação preserva `.nojekyll` e copia o `CNAME` existente, quando houver. O Vite usará `base: "./"` no modo estático para que o mesmo build funcione no caminho `/palavra-do-dia/` e na raiz de um domínio personalizado.

O GitHub documenta que um push feito por workflow com o `GITHUB_TOKEN` não dispara a compilação do Pages quando a origem é uma branch. Portanto, o workflow usará um token pessoal de acesso fino, limitado a este repositório e com permissão `Contents: Read and write`, armazenado como segredo `GH_PAGES_TOKEN`; o segredo não será escrito no código nem nos logs. O checkout não persistirá a credencial padrão para push. A publicação automática ficará dependente de o proprietário cadastrar esse segredo e, depois disso, executar/reexecutar o workflow. Referências: [configuração da origem de publicação do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) e [permissões do `GITHUB_TOKEN`](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token).

O endereço padrão `github.io` continua disponível. GitHub não registra domínios personalizados; um domínio próprio deve ser adquirido com um registrador externo e configurado por DNS, então associado em Settings → Pages. Se GitHub adicionar um arquivo `CNAME` à branch, o workflow o preservará. Consulte [gerenciamento de domínio personalizado do Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) e a opção Vite [`base`](https://vite.dev/config/shared-options).
