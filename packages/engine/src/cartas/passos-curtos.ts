import { definirCarta } from "../carta.ts";
import { distancia } from "../tabuleiro.ts";

const ALCANCE = 3;

export default definirCarta({
  id: "passos-curtos",
  nome: "Passos curtos",
  tipo: "desvantagem",
  peso: 3,
  descricao: `Suas damas e seus bispos andam no máximo ${ALCANCE} casas.`,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => {
      const tipo = estado.tabuleiro[l.de]?.tipo;
      return l.poder || (tipo !== "dama" && tipo !== "bispo") || distancia(l.de, l.para) <= ALCANCE;
    });
  },
});
