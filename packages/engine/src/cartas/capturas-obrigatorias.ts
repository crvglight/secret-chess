import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "capturas-obrigatorias",
  nome: "Damas",
  tipo: "desvantagem",
  peso: 4,
  descricao:
    "Como no jogo de damas: se alguma peça sua (menos o rei) puder capturar, você é obrigado a capturar com ela. O rei fica de fora.",

  // Só entre os lances legais: nunca obriga uma captura proibida (Trégua, Santuário, xeque...).
  filtrarLegais({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const capturas = lances.filter((l) => !l.poder && estado.tabuleiro[l.de]?.tipo !== "rei" && pecaCapturada(estado, l));
    return capturas.length > 0 ? capturas : lances;
  },
});
