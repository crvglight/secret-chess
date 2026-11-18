import { definirCarta } from "../carta.ts";
import { distancia } from "../tabuleiro.ts";

const ALCANCE = 3;

export default definirCarta({
  id: "torres-curtas",
  nome: "Torres curtas",
  tipo: "desvantagem",
  peso: 2,
  descricao: `Suas torres andam no máximo ${ALCANCE} casas.`,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter(
      (l) => l.poder || l.especial?.startsWith("roque") || estado.tabuleiro[l.de]?.tipo !== "torre" || distancia(l.de, l.para) <= ALCANCE,
    );
  },
});
