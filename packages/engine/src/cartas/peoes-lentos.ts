import { definirCarta } from "../carta.ts";

export default definirCarta({
  id: "peoes-lentos",
  nome: "Peões lentos",
  tipo: "desvantagem",
  peso: 1,
  descricao: "Seus peões nunca andam 2 casas.",

  filtrarLances({ dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => l.especial !== "duplo");
  },
});
