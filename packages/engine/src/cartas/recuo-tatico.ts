import { definirCarta } from "../carta.ts";
import { casasDasPecas, direcaoPeao, fileira } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "recuo-tatico",
  nome: "Recuo tático",
  tipo: "poder",
  peso: 1,
  descricao: "Seus peões podem andar 1 casa para trás, sem capturar (nunca até a sua primeira fileira).",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    const primeira = dono === "brancas" ? 0 : 7;
    for (const de of casasDasPecas(estado, dono, "peao")) {
      const para = de - 8 * direcaoPeao(dono);
      if (para < 0 || para > 63 || fileira(para) === primeira || estado.tabuleiro[para]) continue;
      lances.push({ de, para });
    }
    return lances;
  },
});
