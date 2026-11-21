# Secret Chess

*(antes chamado "Xadrez com Poderes")*

Xadrez 1 contra 1 no navegador em que cada jogador recebe, em segredo, uma carta de **poder** e uma de **desvantagem**. Vence quem der xeque-mate, como no xadrez normal.

## Requisitos

- Node 20 ou mais novo
- pnpm 9 (`npm i -g pnpm@9`)

## No ar

O site está publicado em **https://secret-chess.vercel.app** (partida local, contra a IA, coleção e personalização). O servidor das partidas online ainda não está no ar: a Vercel não mantém conexões abertas (Socket.IO), então ele precisa de outro serviço (Render, Railway, Fly.io). Quando estiver, publique a web com `VITE_SERVIDOR=https://endereco-do-servidor` e o botão "Jogar com amigo" volta a aparecer.

## Estrutura

```
packages/engine   Motor puro em TypeScript (regras, cartas, sorteio) + testes Vitest
apps/web          Interface em React + Vite, tabuleiro em SVG
apps/server       Servidor Node + Socket.IO para partidas online
```

## Comandos

Rode na raiz do projeto:

| Comando | O que faz |
| ------- | --------- |
| `pnpm install` | Instala as dependências de todos os pacotes |
| `pnpm dev` | Sobe a web (http://localhost:5173) e o servidor (http://localhost:3001) juntos |
| `pnpm dev:rede` | Igual ao `pnpm dev`, mas a web fica visível na rede Wi-Fi (para jogar online com alguém da mesma rede) |
| `pnpm dev:web` | Sobe só a web |
| `pnpm dev:server` | Sobe só o servidor (rota de teste: `/saude`) |
| `pnpm test` | Roda os testes de todos os pacotes |
| `pnpm --filter @xadrez/engine test:watch` | Testes do motor em modo observação |
| `pnpm lint` | Roda o ESLint |
| `pnpm typecheck` | Checa os tipos do TypeScript em todos os pacotes |
| `pnpm build` | Gera o build de produção |
| `pnpm publicar` | Gera o build da web e publica na Vercel (https://secret-chess.vercel.app) |

## Regras do motor

- **Xeque, como no xadrez normal:** nenhum lance (nem lance de poder) pode deixar o próprio rei atacado. O rei não vai para casa atacada, peça cravada não sai da frente, e o roque não sai do xeque, não passa por casa atacada nem cai nela. Um poder que não gasta o lance só vale se depois dele ainda houver lance legal.
- **Fim:** sem lance legal e em xeque é xeque-mate (perde); sem lance e fora do xeque é afogamento (empate). Uma carta com condição de derrota também pode encerrar a partida.
- Empate depois de 50 lances seguidos sem captura nem lance de peão, ou ao chegar a 200 lances.
- Se uma carta tirar um rei do tabuleiro, o dono dele perde.
- Promoção: dama por padrão, ou a peça escolhida.
- Usar o poder não gasta o lance: o jogador usa e depois joga (no máximo uma vez por rodada).

## Como criar uma carta

1. Crie um arquivo em `packages/engine/src/cartas/` exportando `definirCarta({...})` como `default`.
2. Adicione-o à lista em `packages/engine/src/cartas/index.ts` (um teste falha se você esquecer).
3. Use os hooks que precisar: `adicionarLances`, `filtrarLances` (com `ordemFiltro`), `aoMover`, `inicioDoTurno`, `condicaoDerrota`, `resumo`, `destaques` e `acaoAtiva` (modos `alvo`, `imediato` ou `lance`). Os tipos estão em `packages/engine/src/carta.ts`.

| Carta | Tipo | Peso | Efeito |
| ----- | ---- | ---- | ------ |
| Escudo | poder | 3 | Uma vez por partida, escolha uma peça sua: ela não pode ser capturada na próxima rodada do adversário. |
| Cavalo saltador | poder | 3 | Duas vezes por partida, um cavalo seu pode fazer dois lances seguidos. |
| Peão veloz | poder | 2 | Seus peões podem andar 2 casas de qualquer fileira, se o caminho estiver livre. |
| Teleporte | poder | 3 | Uma vez por partida, leve uma peça sua (menos o rei) para qualquer casa vazia da sua metade do tabuleiro. |
| Congelar | poder | 3 | Uma vez por partida, escolha uma peça do adversário (menos o rei): ela não pode se mover na próxima rodada dele. |
| Armadilha | poder | 3 | Uma vez por partida, marque em segredo uma casa vazia: a peça do adversário que parar ali é capturada (o rei escapa). |
| Troca de lugar | poder | 2 | Uma vez por partida, duas peças suas trocam de lugar (isso gasta o seu lance). |
| Dama imortal | poder | 4 | Uma vez por partida, se sua dama for capturada, ela volta para a casa inicial dela (se estiver vazia). |
| Peões guerreiros | poder | 2 | Seus peões também capturam a peça que está bem na frente deles. |
| Recuo tático | poder | 1 | Seus peões podem andar 1 casa para trás, sem capturar (nunca até a sua primeira fileira). |
| Promoção antecipada | poder | 3 | Seus peões já promovem ao chegar na 6ª fileira (3ª para as pretas). |
| Cavalaria pesada | poder | 3 | Seus cavalos também andam 1 casa em qualquer direção, como o rei. |
| Torres ágeis | poder | 2 | Suas torres também andam 1 casa na diagonal. |
| Rei guerreiro | poder | 1 | Seu rei pode andar até 2 casas em linha reta, se a casa do meio estiver livre. |
| Fantasma | poder | 3 | Suas torres e seus bispos podem atravessar uma peça sua no caminho. |
| Avanço em massa | poder | 2 | Duas vezes por partida, mova dois peões diferentes no mesmo turno. |
| Segunda chance | poder | 4 | Uma vez por partida, depois do lance do adversário, volte o tabuleiro para antes do seu último lance e jogue outro. |
| Bispo camaleão | poder | 2 | Seus bispos também andam 1 casa na reta (e assim trocam a cor da casa). |
| Guarda real | poder | 2 | Peças suas encostadas no seu rei não podem ser capturadas por peões. |
| Necromante | poder | 3 | Uma vez por partida, traga de volta a sua peça capturada mais valiosa (torre, bispo ou cavalo) para uma casa vazia da sua primeira fileira. |
| Sniper | poder | 4 | Uma vez por partida, um bispo ou uma torre sua captura a distância, sem sair do lugar. |
| Clone | poder | 2 | Uma vez por partida, crie uma cópia de um peão seu numa casa vizinha vazia (gasta o seu lance). |
| Ilusão | poder | 2 | Uma vez por partida, uma peça sua (menos o rei) parece um peão para o adversário até se mover. |
| Contra-ataque | poder | 3 | Uma vez por partida, quando o adversário capturar uma peça sua, a sua peça mais barata que alcança captura de volta na hora, de graça. |
| Rainha das sombras | poder | 3 | Sua dama também pode se mover como um cavalo. |
| Bomba | poder | 3 | Uma vez por partida, marque em segredo uma peça sua: se ela for capturada, explode e leva junto quem capturou e as peças vizinhas (menos os reis). |
| Yuumi | poder | 3 | Uma peça sua pode subir de carona em outra peça sua (menos o rei). Quando na carona, quem anda primeiro é sempre a peça de cima, assim descendo. |
| C4 | poder | 3 | A casa c4 é uma mina secreta: a peça do adversário que parar nela explode. Se for o rei, você vence! Vale a partida toda. |
| F5 | poder | 2 | A casa f5 é secreta: a sua peça que parar nela vira outra peça sorteada (menos rei). Vale a partida toda. |
| Daltônico | poder | 4 | Uma vez por partida, é como se todas as peças ficassem da mesma cor que as suas: mova uma peça do adversário (menos o rei) como se fosse sua; ela pode até capturar outra peça dele. |
| Peãogonista | poder | 2 | Um dos seus peões é sorteado em segredo e ganha uma vida extra: na primeira vez que for capturado, ele fica intacto no lugar e o adversário perde o lance. |
| Bispos tímidos | desvantagem | 3 | Seus bispos não podem capturar. |
| Rainha preguiçosa | desvantagem | 2 | Sua dama não pode se mover nos 5 primeiros lances. |
| Batalha de peões | desvantagem | 3 | Você perde se tiver menos peões que o adversário. |
| Dama frágil | desvantagem | 4 | Você perde se ficar sem nenhuma dama no tabuleiro. |
| Damas | desvantagem | 4 | Como no jogo de damas: se puder capturar alguma peça, você é obrigado a capturar. |
| Sem roque | desvantagem | 1 | Você não pode fazer roque. |
| Rei preso | desvantagem | 2 | Seu rei não pode se mover nos 10 primeiros lances. |
| Cavalos cansados | desvantagem | 2 | Um cavalo seu que se moveu não pode se mover de novo na sua rodada seguinte. |
| Torres curtas | desvantagem | 2 | Suas torres andam no máximo 3 casas. |
| Sem recuo | desvantagem | 3 | Suas peças (menos o rei) nunca podem voltar para trás. |
| Pacifista | desvantagem | 2 | Você não pode capturar nos 6 primeiros lances. |
| Cavalos tímidos | desvantagem | 3 | Seus cavalos não podem capturar. |
| Peões lentos | desvantagem | 1 | Seus peões nunca andam 2 casas. |
| Centro proibido | desvantagem | 2 | Suas peças não podem parar em d4, d5, e4 e e5. |
| Passos curtos | desvantagem | 3 | Suas damas e seus bispos andam no máximo 3 casas. |
| Prazo | desvantagem | 3 | Você perde se fizer 12 lances seguidos sem capturar nada. |
| Fronteira | desvantagem | 3 | Suas peças (menos os peões) não podem entrar nas 2 últimas fileiras do adversário. Dar xeque no rei sempre pode. |
| Exército pequeno | desvantagem | 3 | Você perde se ficar com 4 peças ou menos (contando o rei). |
| Rei impaciente | desvantagem | 3 | Seu rei precisa se mover pelo menos uma vez a cada 6 lances seus. No 6º lance sem mexer o rei, só ele pode jogar; se ele não tiver lance, você perde. |
| Peças pesadas | desvantagem | 3 | Você não pode mover a mesma peça em duas rodadas seguidas. |
| Rei medroso | desvantagem | 2 | Seu rei nunca pode capturar. |
| Espião | desvantagem | 2 | O adversário vê as suas cartas desde o início da partida. |
| Maldição | desvantagem | 3 | A cada 10 lances seus, uma peça sua (menos o rei) some do tabuleiro. |
| Lado errado | desvantagem | 1 | Você só faz o roque longo, e seus peões não capturam para a esquerda (do seu ponto de vista). |
| Lentidão | desvantagem | 2 | Você começa com 1 minuto a menos no relógio (só em partidas com relógio). |
| Kamikaze | desvantagem | 3 | Se você puder dar xeque no rei do adversário, você é obrigado a dar. |
| Regigigas | desvantagem | 2 | Nos seus 5 primeiros lances, você só pode mover peões. |

O sorteio compara o saldo de cada lado (peso do poder menos peso da desvantagem) e mantém a diferença em no máximo 1. Cartas de peso maior saem menos: a chance relativa é 6 − peso (peso 1 sai 5 vezes mais que peso 5).

Para testar cartas específicas, abra `?cartas=poderBrancas,desvBrancas,poderPretas,desvPretas#local` (ex.: `?cartas=teleporte,prazo,armadilha,rei-preso#local`).

Os poderes têm três modos: **alvo** (escolhe uma casa e depois joga), **imediato** (aperta o botão e depois joga) e **lance** (o poder é o próprio lance, escolhido no tabuleiro).

## Modos de jogo

| Modo | Como funciona |
| ---- | ------------- |
| Padrão | 1 poder e 1 desvantagem sorteados em segredo |
| Draft | Cada lado vê 3 poderes e 3 desvantagens (com os mesmos pesos do outro lado) e escolhe 1 de cada |
| Mão de cartas | Cada lado começa com 3 poderes de uso único na mão (baralhos com os mesmos pesos) e compra 1 a cada 10 lances, até 5. Jogar uma carta não gasta o lance: ela vale por uma rodada (a sua e a do adversário). A desvantagem continua sorteada. |
| Caos | Cartas como no Padrão e, a cada 8 lances (4 de cada lado), um evento global: Terremoto, Espelho, Trégua, Tempestade, Revolução ou Apagão. O próximo evento aparece na tela antes de chegar. |

Atalhos: acrescente o modo no fim da URL, como `#local-draft` ou `#ia-medio-brancas-draft`.

**Casas especiais** (opção em qualquer modo, ou `?casas=1` na URL): cada partida sorteia 4 dos 16 tipos — portal, lama, baú, muralha, gelo, trampolim, torre de vigia, santuário, forja, vulcão, esteira, espelho, areia movediça, altar, névoa e casa da sorte. Ficam no meio do tabuleiro, espelhadas para os dois lados; a legenda na partida explica as que estão em jogo. `?casas=todas` põe os 16 tipos de uma vez (para conferir).

## Partida online

Na tela inicial, **Jogar com amigo**: escolha o modo, as casas especiais, o relógio (3, 5 ou 10 minutos, ou sem tempo) e a cor; o jogo cria a sala e mostra o link (`#sala-CÓDIGO`) e o código. Quem abre o link (ou digita o código no Início) entra na outra cor.

- **O servidor é a autoridade** (`apps/server`): guarda o estado completo e as cartas, valida cada ação com o motor e manda a cada jogador uma vista sem os segredos do adversário (cartas e mão viradas, armadilha/bomba escondidas, peça da Ilusão como peão, peça na névoa vai como "?" e o tipo dela não sai do servidor). Lance barrado por algo escondido volta com "Uma carta do adversário impede este lance".
- **Reconexão:** cada jogador guarda um token no navegador; abrir o link de novo volta para a mesma cor. Quem fica fora mais de 60 s perde por abandono.
- **Relógio:** corre no servidor; quem tem a desvantagem Lentidão começa com 1 minuto a menos (ela só entra no sorteio quando há relógio).
- **Reações prontas** (sem chat livre), **desistir** e **revanche** (as cores trocam).
- No online valem todas as cartas oficiais (as cartas criadas por você ficam só nas partidas locais e contra a IA).
- Para jogar com alguém na mesma rede: `pnpm dev:rede` e mande o link com o IP do computador no lugar de "localhost". No build publicado, o endereço do servidor vem de `VITE_SERVIDOR`.

## Progresso (fica salvo no navegador)

Todas as cartas oficiais valem desde a primeira partida. Na tela inicial, **Conquistas e histórico**:

- **Conquistas:** contadas nas partidas contra a IA e online.
- **Histórico e replay:** as últimas 30 partidas, para rever lance a lance com as cartas reveladas. O replay refaz a partida a partir do estado inicial e das ações.
- **Estatísticas:** partidas e taxa de vitória de quem tinha cada carta, para ajustar os pesos.

## IA

Fica em `packages/engine/src/ia/` e roda num Web Worker (`apps/web/src/ia/`). É um negamax com poda alfa-beta, busca de capturas no fim da linha e aprofundamento iterativo com limite de tempo. A IA só enxerga as próprias cartas e decide sozinha quando vale a pena usar o poder.

| Nível | Profundidade | Observação |
| ----- | ------------ | ---------- |
| Fácil | 1 | Sorteia entre lances até 1,5 peão piores que o melhor e não usa o poder |
| Médio | 3 | Usa o poder |
| Difícil | 4 | Ordena os lances (capturas primeiro) e usa o poder |

### Análise (só no modo de desenvolvimento)

Com `pnpm dev`, aperte **Alt+A** numa partida para abrir a **janela de análise ao vivo** (dá para deixar em outro monitor). Ela acompanha a partida sozinha e vai aprofundando sem parar, como a análise do Stockfish: mostra as 5 melhores jogadas para quem tem a vez, com a nota (em peões), a continuação prevista, uma barra de avaliação e setas verdes no tabuleiro dela. A aba do jogo e a janela conversam por `BroadcastChannel`. A análise usa só as cartas de quem joga. O código fica em `apps/web/src/dev/` e não entra no build publicado (`pnpm build`).

Atalhos de URL para testar: `#local` e `#ia-<facil|medio|dificil>-<brancas|pretas>` (a cor é a sua).

## Etapas

1. [x] Monorepo, TypeScript, lint, Vitest e README
2. [x] Motor: regras sem xeque-mate, sistema de cartas, 6 cartas iniciais e sorteio equilibrado
3. [x] Web: partida local com tabuleiro em SVG
4. [x] IA com 3 níveis num Web Worker
5. [x] Partida online com salas, reconexão e relógio
6. [x] Personalização: 10 temas de tabuleiro + Personalizado (cores próprias), 7 estilos de peças, cores das peças, coordenadas, último lance, lances possíveis, animação, tamanho do tabuleiro e cor das setas. Tudo salvo no navegador e também no ⚙ da partida
