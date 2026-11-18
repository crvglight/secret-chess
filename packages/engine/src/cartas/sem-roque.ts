import { definirCarta } from "../carta.ts";

export default definirCarta({
  id: "sem-roque",
  nome: "Sem roque",
  tipo: "desvantagem",
  peso: 1,
  descricao: "Você não pode fazer roque.",

  filtrarLances({ dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => l.especial !== "roque-curto" && l.especial !== "roque-longo");
  },
});
