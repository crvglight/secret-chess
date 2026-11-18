import { definirCarta } from "../carta.ts";
import { coluna, pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "lado-errado",
  nome: "Lado errado",
  tipo: "desvantagem",
  peso: 1,
  descricao: "Você só faz o roque longo, e seus peões não capturam para a esquerda (do seu ponto de vista).",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    // "Esquerda" para as brancas é a coluna a; para as pretas (tabuleiro virado), a coluna h.
    const sentido = dono === "brancas" ? 1 : -1;
    return lances.filter((l) => {
      if (l.especial === "roque-curto") return false;
      const peao = estado.tabuleiro[l.de]?.tipo === "peao";
      return !(peao && pecaCapturada(estado, l) && (coluna(l.para) - coluna(l.de)) * sentido < 0);
    });
  },
});
