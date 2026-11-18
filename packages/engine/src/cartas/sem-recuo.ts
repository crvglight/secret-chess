import { definirCarta } from "../carta.ts";
import { avancoDoLance } from "../tabuleiro.ts";

export default definirCarta({
  id: "sem-recuo",
  nome: "Sem recuo",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Suas peças (menos o rei) nunca podem voltar para trás.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => l.poder || estado.tabuleiro[l.de]?.tipo === "rei" || avancoDoLance(l, dono) >= 0);
  },
});
