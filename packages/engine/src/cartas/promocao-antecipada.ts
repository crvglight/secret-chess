import { definirCarta } from "../carta.ts";
import { PROMOCOES } from "../movimentos.ts";
import { fileira } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "promocao-antecipada",
  nome: "Promoção antecipada",
  tipo: "poder",
  peso: 4,
  descricao: "Seus peões já promovem ao chegar na 6ª fileira (3ª para as pretas).",
  // Transforma os lances antes dos outros filtros.
  ordemFiltro: -1,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const alvo = dono === "brancas" ? 5 : 2;
    return lances.flatMap((l): Lance[] => {
      const peca = estado.tabuleiro[l.de];
      if (l.poder || l.promocao || peca?.tipo !== "peao" || fileira(l.para) !== alvo) return [l];
      return PROMOCOES.map((promocao) => ({ ...l, promocao }));
    });
  },

  aoMover(ctx, { jogador, lance }) {
    if (jogador === ctx.dono && lance.promocao && fileira(lance.para) === (ctx.dono === "brancas" ? 5 : 2)) {
      ctx.registrar("Um peão promoveu antes da hora");
    }
  },
});
