import { definirCarta } from "../carta.ts";
import { casaDoNome, distancia, pecaCapturada } from "../tabuleiro.ts";

/** As 4 casas do centro. */
const CENTRO = new Set(["d4", "d5", "e4", "e5"].map(casaDoNome));

/**
 * Gigante da Colina: no centro, suas peças só caem para quem está encostado nelas
 * (uma casa de distância, em qualquer direção). Cavalos e ataques de longe não pegam.
 */
export default definirCarta({
  id: "gigante-da-colina",
  nome: "Gigante da Colina",
  tipo: "poder",
  peso: 3,
  descricao:
    "Suas peças (menos o rei) nas 4 casas centrais (d4, d5, e4 e e5) só podem ser capturadas corpo a corpo: por uma peça encostada nelas.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador === dono) return lances;
    return lances.filter((l) => {
      const alvo = pecaCapturada(estado, l);
      if (!alvo || alvo.cor !== dono || alvo.tipo === "rei") return true;
      const casaAlvo = estado.tabuleiro.indexOf(alvo);
      return !CENTRO.has(casaAlvo) || distancia(l.de, casaAlvo) <= 1;
    });
  },

});
