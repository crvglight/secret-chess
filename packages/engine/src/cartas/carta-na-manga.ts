import { definirCarta } from "../carta.ts";
import { casa, coluna, dentro, direcaoPeao, fileira } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

/** Carta na Manga: seus peões também capturam para trás (na diagonal). */
export default definirCarta({
  id: "carta-na-manga",
  nome: "Carta na Manga",
  tipo: "poder",
  peso: 2,
  descricao: "Seus peões também podem capturar para trás, na diagonal (nunca até a sua primeira fileira).",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    const atras = -direcaoPeao(dono);
    const primeira = dono === "brancas" ? 0 : 7;
    estado.tabuleiro.forEach((p, de) => {
      if (!p || p.cor !== dono || p.tipo !== "peao") return;
      for (const dc of [-1, 1]) {
        const col = coluna(de) + dc;
        const fil = fileira(de) + atras;
        if (!dentro(col, fil) || fil === primeira) continue;
        const para = casa(col, fil);
        const alvo = estado.tabuleiro[para];
        if (alvo && alvo.cor !== dono) lances.push({ de, para });
      }
    });
    return lances;
  },
});
