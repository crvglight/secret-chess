import { definirCarta } from "../carta.ts";
import { DIAGONAIS, saltos } from "../movimentos.ts";
import { casasDasPecas } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "torres-ageis",
  nome: "Torres ágeis",
  tipo: "poder",
  peso: 2,
  descricao: "Suas torres também andam 1 casa na diagonal.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "torre")) saltos(estado.tabuleiro, de, dono, DIAGONAIS, lances);
    return lances;
  },
});
