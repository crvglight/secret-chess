import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

const LANCES_DE_PAZ = 6;

export default definirCarta({
  id: "pacifista",
  nome: "Pacifista",
  tipo: "desvantagem",
  peso: 2,
  descricao: `Você não pode capturar nos ${LANCES_DE_PAZ} primeiros lances.`,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono || estado.lancesFeitos[dono] >= LANCES_DE_PAZ) return lances;
    return lances.filter((l) => !pecaCapturada(estado, l));
  },

  resumo({ estado, dono }) {
    const faltam = LANCES_DE_PAZ - estado.lancesFeitos[dono];
    return faltam > 0 ? `Pode capturar em ${faltam} lance(s)` : "Já pode capturar";
  },
});
