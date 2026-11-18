import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "cavalos-timidos",
  nome: "Cavalos tímidos",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Seus cavalos não podem capturar.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== "cavalo" || !pecaCapturada(estado, l));
  },
});
