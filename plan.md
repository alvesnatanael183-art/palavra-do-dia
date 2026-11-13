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
