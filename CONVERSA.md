# Secret Chess — registro da conversa

Resumo do que foi feito no projeto (antes "Xadrez com Poderes"), as decisões tomadas e o que ficou pendente.

## No ar

- Site: https://secret-chess.vercel.app (conta Vercel `cauaruela-5559`), publicado com `pnpm publicar`.
- O online fica escondido no site publicado: o servidor Socket.IO ainda não está hospedado (a Vercel não roda esse tipo de servidor).

## O que foi feito

1. **Etapa 1 — base:** monorepo pnpm (`packages/engine`, `apps/web`, `apps/server`), TypeScript estrito, ESLint, Vitest.
2. **Etapa 2 — motor:** gerador de lances próprio (sem chess.js), estado imutável, cartas com ganchos (`adicionarLances`, `filtrarLances`, `aoMover`, `inicioDoTurno`, `condicaoDerrota`...).
3. **Etapa 3 — partida local:** tabuleiro SVG, clique e arraste, cartas viradas com "Ver minhas cartas", "Usar poder", tela de fim.
   - Extra: setas e círculos com o botão direito, como no chess.com.
4. **Etapa 4 — IA:** negamax com poda alfa-beta, quiescência, aprofundamento iterativo e limite de tempo, rodando num Web Worker. Níveis fácil, médio e difícil. A IA não vê as cartas do adversário.
   - Extra (só no seu computador): janela de análise ao vivo, aberta com **Alt+A** no `pnpm dev`. Não entra no build publicado.
5. **Etapa 6 — personalização (feita antes da 5, a seu pedido):** 10 temas de tabuleiro mais um personalizado, 7 estilos de peça, cores das peças, tamanho, coordenadas, último lance, pontos de lance legal, animação e cor das setas.
6. **Cartas:** 51 no total (poderes e desvantagens). Sorteio com peso: chance = 6 − peso, então as cartas mais fortes vêm menos.
7. **Modos de jogo:**
   - **Padrão:** cada lado recebe 1 poder e 1 desvantagem secretos.
   - **Draft:** você escolhe as cartas entre opções sorteadas.
   - **Mão de cartas:** começa com 3 cartas, recebe mais 1 a cada 10 lances, com no máximo 5 na mão.
   - **Caos:** um evento global a cada 8 meios-lances, com o próximo evento mostrado a todos.
8. **Casas especiais:** 16 tipos. Cada partida sorteia 4 tipos, espelhados nas duas metades do tabuleiro.
9. **Regra do xeque (como no chess.com):** aviso de xeque. Em xeque, só valem lances que resolvem o xeque. Sem saída, a partida termina em xeque-mate.
10. **Progresso:** conquistas, histórico com replay e estatísticas por carta. O desbloqueio de cartas foi removido: todas as cartas vêm liberadas desde o início.
11. **Menu** reestilizado. **Nome:** "Secret Chess".
12. **Etapa 5 — online:** o servidor é a autoridade da partida, e cada jogador só vê o que pode ver. Também tem:
    - código de sala;
    - relógio;
    - 60 s para voltar se a conexão cair;
    - draft;
    - revanche com troca de cores;
    - reações.

## Como jogar com amigos

- **Mesmo Wi-Fi:** rode `pnpm dev:rede` e o amigo abre `http://<IP do seu PC>:5173`. Uma VPN (NordVPN) ou o firewall do Windows podem bloquear a conexão.
- **Pela internet (pendente):** hospedar o servidor (por exemplo no Render) e publicar o site com `VITE_SERVIDOR` apontando para ele.

## Comandos

| Comando | Para quê |
|---|---|
| `pnpm dev` | Site e servidor locais (com a análise Alt+A) |
| `pnpm dev:rede` | O mesmo, acessível na rede local |
| `pnpm test` | Testes (motor, servidor e web) |
| `pnpm lint` / `pnpm typecheck` | Verificações de código |
| `pnpm publicar` | Gera o build e publica na Vercel |

## Pendências

- Online pela internet: repositório no GitHub (commits com cauaruela@gmail.com) e servidor no Render.
