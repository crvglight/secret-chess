import { definirCarta } from "../carta.ts";
import { coluna, pecaCapturada } from "../tabuleiro.ts";

/** Esquerdista: seus bispos só capturam nas diagonais para a esquerda (do seu ponto de vista). */
export default definirCarta({
  id: "esquerdista",
  nome: "Esquerdista",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Seus bispos só capturam nas diagonais para a esquerda (do seu ponto de vista).",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    return lances.filter((l) => {
      const p = estado.tabuleiro[l.de];
      if (l.poder || l.montada || p?.tipo !== "bispo" || p.cor !== dono || !pecaCapturada(estado, l)) return true;
      // Esquerda das brancas = coluna menor; as pretas olham do outro lado.
      const paraEsquerda = dono === "brancas" ? coluna(l.para) < coluna(l.de) : coluna(l.para) > coluna(l.de);
      return paraEsquerda;
    });
  },
});
