import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "bispos-timidos",
  nome: "Bispos tímidos",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Seus bispos não podem capturar.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== "bispo" || !pecaCapturada(estado, l));
  },
});
