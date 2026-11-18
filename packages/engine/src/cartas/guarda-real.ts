import { definirCarta } from "../carta.ts";
import { casasDasPecas, distancia, pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "guarda-real",
  nome: "Guarda real",
  tipo: "poder",
  peso: 2,
  descricao: "Peças suas encostadas no seu rei não podem ser capturadas por peões.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador === dono) return lances;
    const reis = casasDasPecas(estado, dono, "rei");
    return lances.filter((l) => {
      if (estado.tabuleiro[l.de]?.tipo !== "peao") return true;
      const alvo = pecaCapturada(estado, l);
      if (!alvo || alvo.cor !== dono || alvo.tipo === "rei") return true;
      const casaAlvo = l.especial === "en-passant" ? estado.tabuleiro.indexOf(alvo) : l.para;
      return !reis.some((r) => distancia(r, casaAlvo) === 1);
    });
  },
});
