import { definirCarta } from "../carta.ts";
import { distancia } from "../tabuleiro.ts";

/** Ansiedade: os peões encostados no seu rei não podem se afastar dele. */
export default definirCarta({
  id: "ansiedade",
  nome: "Ansiedade",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Os peões encostados no seu rei não podem se afastar dele (só podem ir para casas que continuem encostadas no rei).",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const rei = estado.tabuleiro.findIndex((p) => p?.tipo === "rei" && p.cor === dono);
    if (rei < 0) return lances;
    return lances.filter((l) => {
      const p = estado.tabuleiro[l.de];
      if (l.montada || p?.tipo !== "peao" || p.cor !== dono || distancia(l.de, rei) !== 1) return true;
      return distancia(l.para, rei) <= 1;
    });
  },
});
