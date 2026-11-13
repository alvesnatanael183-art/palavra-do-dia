# Plano de atualização — Palavra Viva

## Objetivo e decisões de implementação

Ampliar o site existente com uma seção de mensagens do profeta William Marrion Branham, inspirada no fluxo de pesquisa do The Table, e um parágrafo devocional diário logo abaixo do versículo do dia. Preservar o leitor bíblico, a busca atual, o tema visual e a navegação já existentes.

A página `/mensagens` terá uma barra de pesquisa e um layout de dois painéis: resultados à esquerda e passagem selecionada à direita. Reproduzir os comportamentos centrais observados no The Table: pesquisa por todas as palavras ou por frase exata, contagem e contexto curto nos resultados, paginação e destaque do termo no trecho selecionado. O acesso ao conteúdo será feito pela API REST pública do The Table em uma rota de servidor controlada; a UI não fará chamadas cross-origin nem incorporará iframe, pois o site de referência envia `X-Frame-Options: SAMEORIGIN`. Limitar a integração aos resultados e aos trechos curtos retornados pela pesquisa; a transcrição integral e o áudio permanecerão na fonte oficial. Como a rota pública não serializa a consulta nem o sermão selecionado, mostrar o título, código e intervalo de parágrafos, permitir copiar essa referência e oferecer link para a biblioteca oficial; não inventar um permalink. Não armazenar o acervo no projeto.

Na página inicial, acrescentar imediatamente abaixo do versículo diário um parágrafo de reflexão original, com referência explícita a uma mensagem relacionada e link para buscá-la. A passagem bíblica e a reflexão devem tratar do mesmo tema; usar uma escolha diária determinística para que o conteúdo apresentado corresponda à data local. A reflexão será identificada como texto editorial inspirado na mensagem, não como transcrição literal.

A autorização explícita do usuário permite habilitar permanentemente `features.server:true`. Não criar banco de dados. Reutilizar o Express, Vite, Dockerfile e script de build existentes: gerar o frontend estático com `pnpm build` dentro do contêiner e servi-lo no mesmo processo Express que responde à busca em `/api/*`. As rotas de página permanecem atendidas pelo fallback SPA do contêiner. Manter os recursos e rotas anteriores.

## Estrutura do projeto

- `client/src/pages/Messages.tsx`: interface de pesquisa e seleção em dois painéis, controles de busca e navegação dos resultados.
- `client/src/lib/prophetMessages.ts`: tipos e chamadas do frontend para o endpoint interno `/api/messages/search`.
- `client/src/pages/Home.tsx`: versículo e reflexão do dia relacionados, na ordem solicitada.
- `client/src/components/SiteHeader.tsx` e `client/src/App.tsx`: navegação e rota para Mensagens.
- `server/_core/sermonProxy.ts` e `server/_core/index.ts`: validação, proxy limitado ao endpoint de busca oficial e resposta sanitizada para o browser.
- `client/public/manus-routes.json`: declaração sincronizada das rotas públicas.
- `client/src/index.css`: estilos novos coerentes com o editorial azul e papel já existente, responsivos e acessíveis.
- `TODO.md`: critérios completos e status das entregas novas, preservando o histórico concluído.

## Design

Reutilizar o estilo editorial sereno do Palavra Viva: fundos claros, tipografia serifada nos textos de leitura, azul discreto para navegação e destaque, cartões leves e uma divisão de painéis que se empilha no celular. Na pesquisa, manter o foco na leitura, com hierarquia clara entre título da mensagem, código, passagem, snippet e fonte oficial.

## Evidências de referência

O guia oficial descreve busca por todas as palavras e por frase exata, filtros por ano/série, ordenação, paginação e abertura de um resultado com destaque dos termos: [Guia de pesquisa do The Table](https://support.branham.org/en/thetableapp/android/10132021_TheAndroidTable_Search). A interface pública portuguesa foi examinada em [The Table](https://table.branham.org/#/pt/main). O cliente público usa `POST /rest/userQuery` com idioma, tipo de busca, texto e paginação; uma consulta de exemplo retornou 2.030 ocorrências para “fé”. O parâmetro `q` adicionado à rota hash não preencheu a pesquisa, e a navegação da interface permaneceu em `#/pt/main`; por isso, o Palavra Viva exibe e permite copiar o código/título/parágrafos para localizar a mensagem na biblioteca oficial, em vez de prometer um link direto não suportado.
