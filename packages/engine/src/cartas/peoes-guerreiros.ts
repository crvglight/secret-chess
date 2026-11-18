import { definirCarta } from "../carta.ts";
import { adicionarLancePeao } from "../movimentos.ts";
import { casasDasPecas, direcaoPeao, fileira } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "peoes-guerreiros",
  nome: "Peões guerreiros",
  tipo: "poder",
  peso: 2,
  descricao: "Seus peões também capturam a peça que está bem na frente deles.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "peao")) {
      const para = de + 8 * direcaoPeao(dono);
      if (fileira(de) === (dono === "brancas" ? 7 : 0)) continue;
      const alvo = estado.tabuleiro[para];
      if (alvo && alvo.cor !== dono) adicionarLancePeao(lances, de, para, dono);
    }
    return lances;
  },

  aoMover(ctx, { jogador, lance, peca, captura }) {
    if (jogador !== ctx.dono || peca.tipo !== "peao" || !captura) return;
    if (lance.para - lance.de === 8 * direcaoPeao(ctx.dono)) ctx.registrar("Um peão capturou para a frente");
  },
});
