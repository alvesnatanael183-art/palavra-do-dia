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

## Servidor da busca integrada — concluído
- O usuário autorizou habilitar permanentemente o recurso de servidor do projeto para integrar a pesquisa real das mensagens.
- Habilitar o servidor sem habilitar nem criar banco de dados.
- Validar consultas e encaminhar apenas a rota de pesquisa permitida do The Table; não armazenar nem expor a chave ou copiar o acervo integral.
- Gerar e servir o frontend estático no contêiner Express, junto do endpoint `/api/*`; preservar as rotas de página com fallback SPA.
