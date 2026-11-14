# Entregas

## Página inicial e exploração dos livros — concluído
- Criar um site com experiência inspirada em https://www.bibliaonline.com.br/.
- A página inicial deve oferecer acesso direto à leitura bíblica, seleção de livro e campo de busca em destaque.
- Organizar a navegação da Bíblia por Antigo e Novo Testamento, com listagem de livros.
- Permitir encontrar livros e capítulos e abrir rapidamente uma seção específica do livro escolhido.

## Leitura de capítulos e navegação entre referências — concluído
- A página de leitura deve exibir o nome do livro, o número do capítulo, versículos numerados e tipografia confortável.
- Incluir controles para avançar ou voltar entre capítulos durante a leitura.
- Criar URLs próprias para livros, capítulos e passagens, permitindo compartilhar e acessar diretamente uma referência.
- Ao abrir uma passagem, posicionar a leitura na referência e destacar visualmente o versículo indicado.

## Pesquisa de palavras e trechos bíblicos — concluído
- Permitir buscar palavras ou trechos bíblicos.
- Exibir resultados com a referência bíblica e um fragmento do texto correspondente.
- Abrir cada resultado diretamente na passagem correspondente e indicar visualmente o versículo relevante.

## Uso em diferentes telas — concluído
- Oferecer layout responsivo para leitura e navegação em celulares, tablets e computadores.

## Pesquisa integrada nas mensagens do profeta — concluído
- “implementar esse site que vc acabou de ler toda estrutura e colocar dentro Palavra Viva com uma barra de pesquisa nas mensagem do profeta”.
- Disponibilizar dentro do Palavra Viva uma área própria de mensagens do profeta William Marrion Branham, com uma barra de pesquisa e estrutura inspirada na referência The Table.
- Permitir pesquisar todas as palavras ou uma frase exata nas mensagens, informar a quantidade de ocorrências e apresentar trechos de contexto.
- Apresentar resultados e trecho selecionado em dois painéis; ao escolher um resultado, destacar os termos pesquisados no trecho e identificar mensagem e passagem.
- Permitir continuar a navegação entre resultados sem perder a consulta atual.
- Exibir a fonte oficial, o título, o código e o intervalo de parágrafos para localizar a mensagem integral no The Table; permitir copiar essa referência; não copiar nem armazenar o acervo completo no Palavra Viva.
- A página deve permanecer utilizável em celular, tablet e computador.

## Parágrafo diário alinhado ao versículo — concluído
- “um paragrafo diário seja colocado na tela de inicio em baixo do versículo bíblico diário que as palavras esteja em acordos”.
- Na tela inicial, colocar um parágrafo diário imediatamente abaixo do versículo bíblico do dia.
- O parágrafo deve manter coerência temática com o versículo do dia, indicar a mensagem relacionada e oferecer um link para pesquisá-la.
- Identificar o parágrafo como reflexão editorial inspirada na mensagem, e não como citação literal.

## Ajustes de texto recebidos pela prévia — concluído
- Alterar o título da chamada de leitura `.reading-callout h2` de “Leia com calma. Volte quando quiser.” para “Medite Nas Palavras”.
- Remover o título `.books-title-row h2` “Livros da Bíblia” e suas regras visuais, conforme o conteúdo e estilos vazios no JSON; preservar o rótulo “EXPLORE AS ESCRITURAS”, a descrição, a contagem, os filtros e a lista de livros.

## Textos da home recebidos na prévia — concluído
- Substituir o título principal “A Palavra de Deus / sempre com você.” por “A Fé É o Firme Fundamento”, sem alterar a busca, a descrição nem as leituras rápidas.
- Atualizar o `.eyebrow` de “UM ESPAÇO PARA A PALAVRA” para “SEMENTE CRÉ” e, na alteração seguinte do mesmo elemento, para “SEMENTE CRE”; o estado final solicitado é exatamente “SEMENTE CRE”.
- Alterar `.reading-callout h2` de “Medite Nas Palavras” para “LER  OS LIVROS SAGRADOS”.

## Busca de mensagens na página inicial — concluído
- “quero que vc coloque uma busca nas mesagen do profeta acima do nome explore as escrituras”.
- Exibir uma barra de busca das mensagens do profeta na página inicial, imediatamente acima do texto “EXPLORE AS ESCRITURAS”.
- Ao enviar uma consulta, abrir a página integrada de mensagens com o termo preenchido e iniciar a busca; manter disponíveis lá os modos de todas as palavras e frase exata.
- Preservar a busca bíblica existente, a listagem de livros e a responsividade da página.

## Buscar mensagens por livro e ler os trechos — concluído
- “coloque abaixo do nome mensagen do profeta um barra de pesquisa onde eu possa pequisa por livros e ler seguindo esse exemplo do link https://table.branham.org/#/pt/main”.
- Colocar a barra de pesquisa diretamente abaixo do rótulo “MENSAGENS DO PROFETA” na home, antes de “EXPLORE AS ESCRITURAS”.
- Permitir digitar palavras/frases e sugerir os nomes dos livros bíblicos disponíveis para pesquisar esses termos no arquivo de mensagens do profeta.
- Enviar a consulta para a busca integrada do The Table, exibir resultados e permitir selecionar e ler o trecho contextualizado, preservando os modos de todas as palavras e frase exata na página de resultados.
- Manter os demais componentes da home e o layout responsivo.

## Rótulo do link para a fonte oficial — concluído
- No link `.official-search-link`, substituir apenas o texto visível “Fonte: Voice of God Recordings” por “Abrir Livro.”.
- Preservar o destino oficial do The Table, o ícone de link externo, a abertura em nova aba e os demais controles da busca.

## Catálogo alfabético e leitura integral das mensagens — concluído
- “quero que ao lado dessas palavras ,todas as palavras, frases exatas apareça o nome abri livros ao clicar possa abrir as mensagem do profeta em orden alfabética pra ler o livro inteiro nessa orden https://table.branham.org/#/pt/main”.
- Adicionar “Abrir Livros” ao lado dos modos “Todas as palavras” e “Frase exata”.
- Ao selecionar “Abrir Livros”, exibir as mensagens disponíveis em português ordenadas alfabeticamente pelo título; ao selecionar uma, abrir sua transcrição integral no painel de leitura do Palavra Viva.
- Permitir avançar e voltar entre mensagens seguindo a mesma ordem alfabética, para continuar a leitura nessa ordem.
- O usuário confirmou que tem autorização/licença para exibir o texto integral no Palavra Viva.
- Carregar o texto completo somente quando uma mensagem for selecionada; não baixar em massa nem persistir o acervo de transcrições.
- Manter a busca textual atual, os modos de busca e a navegação responsiva.

## Preferências de leitura e busca no catálogo — concluído
- “Implementar um modo de leitura noturna e ajuste de tamanho de fonte no leitor de livros completos. em abrir livros quero uma barra de pesquisa pra eu procurar o livro que desejo ler”.
- No leitor da transcrição integral, oferecer alternância entre leitura clara/noturna e controles para aumentar e reduzir o tamanho do texto.
- Dentro de “Abrir Livros”, exibir uma barra para procurar uma mensagem pelo título ou código e selecionar o resultado para leitura integral.
- Preservar a ordem alfabética, a navegação anterior/próxima, a busca por trechos e a responsividade.

## Servidor da busca integrada — concluído
- O usuário autorizou habilitar permanentemente o recurso de servidor do projeto para integrar a pesquisa real das mensagens.
- Habilitar o servidor sem habilitar nem criar banco de dados.
- Validar consultas e encaminhar apenas a rota de pesquisa permitida do The Table; não armazenar nem expor a chave ou copiar o acervo integral.
- Gerar e servir o frontend estático no contêiner Express, junto do endpoint `/api/*`; preservar as rotas de página com fallback SPA.


## Publicação estática no GitHub Pages — concluído
- “Desejo publicar este site no GitHub Pages para que ele fique acessível online.”
- O usuário escolheu: “1. Apenas GitHub Pages estático” e aceitou que a busca/leitura integrada de mensagens não funcionará no Pages sem o backend.
- Publicar uma versão estática do site em `https://alvesnatanael183-art.github.io/palavra-do-dia/`, mantendo a leitura bíblica dos livros/capítulos/versículos, a busca bíblica e o versículo/reflexão diária.
- A versão estática deve continuar funcionando no caminho do projeto `/palavra-do-dia/` e permitir servir os assets na raiz de domínio personalizado usando base relativa `./`; a SPA deve usar rotas compatíveis com GitHub Pages, sem depender do servidor Express.
- No GitHub Pages, não invocar a integração/API de mensagens do projeto nem apresentar erros de API: explicar que busca, catálogo e transcrição integrada de mensagens não estão disponíveis nessa versão e oferecer um link para abrir o The Table oficial (`https://table.branham.org/#/pt/main`).
- Preservar a versão com Express no Manus, onde a busca, o catálogo A–Z e a leitura integral existentes continuam disponíveis.
- Preparar os arquivos estáticos na raiz do ramo de publicação `gh-pages` e configurar a origem do GitHub Pages para esse ramo/raiz. Neste caso, o proprietário autorizou explicitamente tornar público o repositório inteiro e confirmou os efeitos avisados pelo GitHub.
- Não tornar o repositório público sem autorização explícita; se o plano do GitHub não permitir Pages a partir do repositório privado, pedir uma decisão ao proprietário antes de alterar a visibilidade ou criar outro repositório público.


## Automação de build e deploy do GitHub Pages — em andamento
- O usuário pediu: “Como automatizar o build e o deploy usando o GitHub Actions para esta branch gh-pages”.
- Ao receber push na branch `main`, compilar a versão estática com `pnpm build:github-pages` e publicar os arquivos públicos necessários de `dist/public` na raiz da branch `gh-pages`; omitir `__manus__/`, `manus-routes.json` e `.gitkeep`; oferecer também execução manual por `workflow_dispatch`.
- Manter GitHub Pages configurado para `gh-pages` / raiz e limitar os gatilhos do workflow a `main` para que os commits de saída em `gh-pages` não iniciem builds recursivos.
- Usar base de asset relativa `./` no build estático para funcionar no endereço de projeto `/palavra-do-dia/` e na raiz de domínio personalizado; preservar `.nojekyll` e um `CNAME` já existente.
- Não usar `GITHUB_TOKEN` para atualizar `gh-pages`, pois um push com essa credencial não dispara o build Pages baseado em branch. Usar apenas o segredo `GH_PAGES_TOKEN`, sem copiar o valor para arquivos ou logs; o proprietário o cadastrará em **Settings → Secrets and variables → Actions** como token de acesso fino restrito a este repositório, com permissão `Contents: Read and write`.
- A primeira publicação automática só poderá concluir depois que o segredo estiver cadastrado; então o workflow deverá ser executado novamente. O GitHub já fornece o endereço `github.io`; um domínio personalizado exige registro e configuração DNS fora do GitHub.
