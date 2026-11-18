import { definirCarta } from "../carta.ts";
import { VIZINHOS } from "../movimentos.ts";
import { casa, casasDasPecas, coluna, dentro, fileira } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "rei-guerreiro",
  nome: "Rei guerreiro",
  tipo: "poder",
  peso: 2,
  descricao: "Seu rei pode andar até 2 casas em linha reta, se a casa do meio estiver livre.",

  // Adiciona no filtro (e não em adicionarLances) para não repetir o lance do roque.
  // Roda antes dos outros filtros, que assim também valem para estes lances.
  ordemFiltro: -1,
  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const t = estado.tabuleiro;
    const extras: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "rei")) {
      for (const [dc, df] of VIZINHOS) {
        const col = coluna(de) + 2 * dc;
        const fil = fileira(de) + 2 * df;
        if (!dentro(col, fil)) continue;
        const meio = casa(coluna(de) + dc, fileira(de) + df);
        const para = casa(col, fil);
        if (t[meio] || t[para]?.cor === dono) continue;
        if (lances.some((l) => l.de === de && l.para === para)) continue;
        extras.push({ de, para });
      }
    }
    return lances.concat(extras);
  },
});
