import { definirCarta } from "../carta.ts";
import { SALTOS_CAVALO, saltos } from "../movimentos.ts";
import { casasDasPecas } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "rainha-das-sombras",
  nome: "Rainha das sombras",
  tipo: "poder",
  peso: 3,
  descricao: "Sua dama também pode se mover como um cavalo.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "dama")) saltos(estado.tabuleiro, de, dono, SALTOS_CAVALO, lances);
    return lances;
  },
});
