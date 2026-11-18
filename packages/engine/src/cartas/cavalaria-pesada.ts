import { definirCarta } from "../carta.ts";
import { saltos, VIZINHOS } from "../movimentos.ts";
import { casasDasPecas } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "cavalaria-pesada",
  nome: "Cavalaria pesada",
  tipo: "poder",
  peso: 3,
  descricao: "Seus cavalos também andam 1 casa em qualquer direção, como o rei.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "cavalo")) saltos(estado.tabuleiro, de, dono, VIZINHOS, lances);
    return lances;
  },
});
