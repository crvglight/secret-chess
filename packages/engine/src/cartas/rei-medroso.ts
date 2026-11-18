import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "rei-medroso",
  nome: "Rei medroso",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Seu rei nunca pode capturar.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== "rei" || !pecaCapturada(estado, l));
  },
});
