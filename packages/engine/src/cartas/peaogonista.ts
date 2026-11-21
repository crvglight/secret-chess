import { definirCarta } from "../carta.ts";
import { nomeCasa } from "../tabuleiro.ts";
import type { Cor, Estado } from "../tipos.ts";

interface Dados {
  /** Sorteado quando a carta entra em jogo: qual dos seus peões (pela ordem) é o escolhido. */
  sorteio: number;
  /** Id do peão escolhido (definido no primeiro momento em que a carta age). */
  pecaId: number | null;
  /** A vida extra já foi gasta. */
  usada: boolean;
}

/** Ids dos peões de `cor`, sempre na mesma ordem. */
const peoesDe = (estado: Estado, cor: Cor) =>
  estado.tabuleiro
    .filter((p) => p?.tipo === "peao" && p.cor === cor)
    .map((p) => p!.id)
    .sort((a, b) => a - b);

/** O peão escolhido (pelo id guardado ou, se ainda não houver, pelo sorteio). */
function escolhido(estado: Estado, cor: Cor, dados: Readonly<Dados>): number | null {
  if (dados.pecaId !== null) return dados.pecaId;
  const peoes = peoesDe(estado, cor);
  return peoes.length > 0 ? peoes[dados.sorteio % peoes.length]! : null;
}

export default definirCarta<Dados>({
  id: "peaogonista",
  nome: "Peãogonista",
  tipo: "poder",
  peso: 2,
  descricao:
    "Um dos seus peões é sorteado em segredo e ganha uma vida extra: na primeira vez que for capturado, ele fica intacto no lugar e o adversário perde o lance.",
  // O sorteio acontece quando a carta entra em jogo e fica guardado no estado
  // (assim o replay, a análise e o servidor online chegam ao mesmo peão).
  dadosIniciais: () => ({ sorteio: Math.floor(Math.random() * 8), pecaId: null, usada: false }),

  inicioDoTurno(ctx) {
    ctx.dados.pecaId ??= escolhido(ctx.estado, ctx.dono, ctx.dados);
  },

  aoMover(ctx, { jogador, antes }) {
    ctx.dados.pecaId ??= escolhido(antes, ctx.dono, ctx.dados);
    const id = ctx.dados.pecaId;
    if (jogador === ctx.dono || ctx.dados.usada || id === null) return;
    const estavaNoTabuleiro = antes.tabuleiro.some((p) => p?.id === id);
    const continua = ctx.estado.tabuleiro.some((p) => p?.id === id);
    if (!estavaNoTabuleiro || continua) return;
    // Capturado pela primeira vez: o tabuleiro volta a como estava e o lance do adversário se perde.
    const casa = antes.tabuleiro.findIndex((p) => p?.id === id);
    ctx.estado.tabuleiro = antes.tabuleiro.slice();
    ctx.estado.montadas = antes.montadas;
    ctx.dados.usada = true;
    ctx.registrar(`Peãogonista: o peão de ${nomeCasa(casa)} usou a vida extra e o adversário perdeu o lance`);
  },

  destaques: ({ estado, dono, dados }) => {
    if (dados.usada) return [];
    const id = escolhido(estado, dono, dados);
    const casa = estado.tabuleiro.findIndex((p) => p?.id === id);
    return casa >= 0 ? [{ casa, publico: false, rotulo: "Vida extra", estilo: "contorno" }] : [];
  },

  resumo: ({ dados }) => (dados.usada ? "vida extra já usada" : "vida extra pronta"),
});
