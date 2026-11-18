Você vai me ajudar a construir o "Xadrez com Poderes", um jogo de xadrez 1 contra 1 para navegador, só para diversão. A pasta atual tem o arquivo `conceito-xadrez-com-poderes.docx` com o conceito completo. Leia-o primeiro, se conseguir.

## A ideia
- Xadrez normal, mas no início cada jogador recebe em segredo 1 carta de PODER (vantagem) e 1 carta de DESVANTAGEM. Inspiração: Drawback Chess.
- Não existe xeque nem xeque-mate. O jogador perde quando o rei é capturado ou quando fica sem lance legal (por causa das regras normais ou da desvantagem). O rei pode ficar "em xeque" e se mover para uma casa atacada.
- Cada carta tem um peso de 1 a 5. O sorteio deixa a diferença de pesos entre os dois lados em no máximo 1 ponto.
- As cartas do adversário ficam ocultas e só são reveladas no fim da partida.

## Stack
- Monorepo com pnpm workspaces e TypeScript em tudo.
- `packages/engine`: motor puro (sem React e sem rede), com testes em Vitest. Pode usar o chess.js como referência ou base para gerar lances, mas as regras precisam aceitar modificadores (cartas).
- `apps/web`: React + Vite, com o tabuleiro desenhado em SVG. Use CSS variables para os temas.
- `apps/server`: Node + Socket.IO para as partidas online. O servidor é a autoridade: valida os lances e guarda as cartas secretas.
- IA: minimax com poda alfa-beta, rodando num Web Worker, que usa o mesmo motor (e portanto respeita as cartas). 3 níveis: fácil (profundidade 1 + aleatoriedade), médio (profundidade 2-3) e difícil (profundidade 4 com ordenação de lances).

## Arquitetura das cartas
Cada carta é um objeto com `id`, `nome`, `descricao`, `tipo` ("poder" | "desvantagem"), `peso` e hooks opcionais, por exemplo:
- `filtrarLances(estado, lances, jogador)`: remove ou adiciona lances legais;
- `aoMover(estado, lance)`: efeitos depois de um lance;
- `condicaoDerrota(estado, jogador)`: derrota extra (ex.: "perde se ficar com menos peões");
- `acaoAtiva` (para poderes com o botão "Usar poder"), com quantas vezes pode ser usada.
Adicionar uma carta nova tem que ser só criar um arquivo em `packages/engine/src/cartas/`, sem mexer no núcleo.

Cartas iniciais para implementar agora (depois chego a 12 + 12):
- Poder "Escudo": uma vez por partida, escolha uma peça sua; ela não pode ser capturada na próxima rodada do adversário.
- Poder "Cavalo saltador": duas vezes por partida, um cavalo seu pode fazer dois lances seguidos.
- Poder "Peão veloz": seus peões podem andar 2 casas de qualquer fileira, se o caminho estiver livre.
- Desvantagem "Bispos tímidos": seus bispos não podem capturar.
- Desvantagem "Rainha preguiçosa": sua dama não pode se mover nos 5 primeiros lances.
- Desvantagem "Batalha de peões": você perde se tiver menos peões que o adversário.

## Personalização
- 4 temas de tabuleiro (madeira, neon, mármore, pixel) e 4 estilos de peças, que podem ser trocados em separado e salvos no localStorage.
- Use só peças desenhadas por você (SVG original) ou conjuntos com licença livre. Anote a licença em `apps/web/src/assets/LICENSES.md`.

## Ordem de trabalho (faça uma etapa por vez e pare no fim de cada uma para eu testar)
1. Montar o monorepo, configurar TypeScript, lint e Vitest, e criar um README com os comandos.
2. Motor: regras do xadrez sem xeque-mate + vitória por captura do rei + sistema de cartas + as 6 cartas acima + sorteio equilibrado. Escreva testes para cada carta e para o fim de partida.
3. Web: tela de partida local (dois jogadores no mesmo computador), com o tabuleiro em SVG, clique ou arrasto, destaque dos lances possíveis, cartas na tela, botão "Usar poder" e tela de fim com as cartas reveladas.
4. IA com os 3 níveis, num Web Worker.
5. Online: criar a sala, gerar o link, sincronizar os lances, reconectar quem caiu e relógio de 3/5/10 minutos ou sem tempo.
6. Tela de personalização com prévia ao vivo e os 4 temas.

## Regras para você
- Sem login, sem banco de dados e sem chat livre nesta fase (só reações prontas, como "GG").
- Código e nomes de variáveis em português ou inglês, mas a interface toda em português do Brasil.
- Antes de começar a etapa 1, me mostre em poucas linhas a estrutura de pastas que você vai criar e qualquer dúvida importante. Depois disso, comece.
