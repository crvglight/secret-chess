import { definirCarta } from "../carta.ts";

const LANCES_PARADA = 5;

export default definirCarta({
  id: "rainha-preguicosa",
  nome: "Rainha preguiçosa",
  tipo: "desvantagem",
  peso: 2,
  descricao: `Sua dama não pode se mover nos ${LANCES_PARADA} primeiros lances.`,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono || estado.lancesFeitos[dono] >= LANCES_PARADA) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== "dama");
  },
});
