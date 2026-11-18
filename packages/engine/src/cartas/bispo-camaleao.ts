import { definirCarta } from "../carta.ts";
import { RETAS, saltos } from "../movimentos.ts";
import { casasDasPecas } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "bispo-camaleao",
  nome: "Bispo camaleão",
  tipo: "poder",
  peso: 2,
  descricao: "Seus bispos também andam 1 casa na reta (e assim trocam a cor da casa).",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "bispo")) saltos(estado.tabuleiro, de, dono, RETAS, lances);
    return lances;
  },
});
