import { definirCarta } from "../carta.ts";
import { casaDoNome, NOME_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Cor, TipoPeca } from "../tipos.ts";

/** A casa da sorte: f5 para as brancas, c4 (a espelhada) para as pretas. */
export const casaDoF5 = (dono: Cor) => casaDoNome(dono === "brancas" ? "f5" : "c4");

const TIPOS: TipoPeca[] = ["peao", "cavalo", "bispo", "torre", "dama"];

/**
 * Sorteio fixo (sempre o mesmo para o mesmo lance e a mesma peça), para o replay,
 * a análise e o servidor online chegarem ao mesmo resultado.
 */
function sorteio(meioLance: number, id: number): number {
  let h = (meioLance * 2654435761 + id * 40503 + 12345) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export default definirCarta({
  id: "f5",
  nome: "F5",
  tipo: "poder",
  peso: 2,
  descricao:
    "A casa f5 (c4 se você for as pretas) é secreta: a sua peça que parar nela vira outra peça sorteada (menos rei). Vale a partida toda.",

  aoMover(ctx, { jogador, lance, antes }) {
    if (jogador !== ctx.dono) return;
    const c = casaDoF5(ctx.dono);
    if (lance.para !== c) return;
    const peca = ctx.estado.tabuleiro[c];
    if (!peca || peca.cor !== ctx.dono || peca.tipo === "rei") return;
    const opcoes = TIPOS.filter((t) => t !== peca.tipo);
    const novo = opcoes[sorteio(antes.meioLance, peca.id) % opcoes.length]!;
    ctx.estado.tabuleiro[c] = { ...peca, tipo: novo };
    ctx.registrar(`F5: o ${NOME_PECA[peca.tipo]} em ${nomeCasa(c)} virou ${NOME_PECA[novo]}`);
  },

  destaques: ({ dono }) => [{ casa: casaDoF5(dono), publico: false, rotulo: "F5" }],
});
