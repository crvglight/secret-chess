import { definirCarta } from "../carta.ts";
import { adicionarLancePeao } from "../movimentos.ts";
import { casasDasPecas, direcaoPeao, fileira, fileiraInicialPeao, nomeCasa } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "peao-veloz",
  nome: "Peão veloz",
  tipo: "poder",
  peso: 2,
  descricao: "Seus peões podem andar 2 casas de qualquer fileira, se o caminho estiver livre.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    const passo = 8 * direcaoPeao(dono);
    for (const de of casasDasPecas(estado, dono, "peao")) {
      // Da fileira inicial o lance duplo já existe no xadrez normal.
      if (fileira(de) === fileiraInicialPeao(dono)) continue;
      const meio = de + passo;
      const para = de + 2 * passo;
      if (para < 0 || para > 63 || estado.tabuleiro[meio] || estado.tabuleiro[para]) continue;
      adicionarLancePeao(lances, de, para, dono, "duplo");
    }
    return lances;
  },

  aoMover(ctx, { jogador, lance }) {
    if (jogador !== ctx.dono || lance.especial !== "duplo") return;
    if (fileira(lance.de) === fileiraInicialPeao(ctx.dono)) return;
    ctx.registrar(`Peão andou 2 casas de ${nomeCasa(lance.de)} para ${nomeCasa(lance.para)}`);
  },
});
