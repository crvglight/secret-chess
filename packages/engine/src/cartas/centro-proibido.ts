import { definirCarta } from "../carta.ts";
import { casaDoNome } from "../tabuleiro.ts";

const CENTRO = ["d4", "d5", "e4", "e5"].map(casaDoNome);

export default definirCarta({
  id: "centro-proibido",
  nome: "Centro proibido",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Suas peças não podem parar em d4, d5, e4 e e5.",

  filtrarLances({ dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => !CENTRO.includes(l.para));
  },
});
