import { definirCarta, ORDEM_FILTRO_FINAL } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "capturas-obrigatorias",
  nome: "Damas",
  tipo: "desvantagem",
  peso: 4,
  descricao: "Como no jogo de damas: se puder capturar alguma peça, você é obrigado a capturar.",
  // Roda no fim (depois das outras cartas, do evento do Caos e das casas especiais),
  // para só contar as capturas permitidas de verdade.
  ordemFiltro: ORDEM_FILTRO_FINAL,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const capturas = lances.filter((l) => !l.poder && pecaCapturada(estado, l));
    return capturas.length > 0 ? capturas : lances;
  },
});
