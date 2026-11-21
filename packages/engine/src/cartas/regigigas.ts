import { definirCarta, ORDEM_FILTRO_FINAL } from "../carta.ts";

/** Quantos lances seus ficam presos aos peões. */
const LANCES_SO_DE_PEAO = 5;

export default definirCarta({
  id: "regigigas",
  nome: "Regigigas",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Nos seus 5 primeiros lances, você só pode mover peões (se nenhum peão puder andar, as outras peças ficam livres).",
  ordemFiltro: ORDEM_FILTRO_FINAL,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono || estado.lancesFeitos[dono] >= LANCES_SO_DE_PEAO) return lances;
    const dePeao = lances.filter((l) => {
      const p = estado.tabuleiro[l.de];
      return p?.cor === dono && p.tipo === "peao" && !l.montada;
    });
    return dePeao.length > 0 ? dePeao : lances;
  },

  resumo: ({ estado, dono }) => {
    const faltam = LANCES_SO_DE_PEAO - estado.lancesFeitos[dono];
    return faltam > 0 ? `só peões por mais ${faltam} lance(s)` : "já pode mover tudo";
  },
});
