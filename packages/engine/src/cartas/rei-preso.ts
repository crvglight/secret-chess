import { definirCarta } from "../carta.ts";

const LANCES_PRESO = 10;

export default definirCarta({
  id: "rei-preso",
  nome: "Rei preso",
  tipo: "desvantagem",
  peso: 2,
  descricao: `Seu rei não pode se mover nos ${LANCES_PRESO} primeiros lances.`,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono || estado.lancesFeitos[dono] >= LANCES_PRESO) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== "rei");
  },

  resumo({ estado, dono }) {
    const faltam = LANCES_PRESO - estado.lancesFeitos[dono];
    return faltam > 0 ? `Rei solto em ${faltam} lance(s)` : "Rei já está solto";
  },
});
