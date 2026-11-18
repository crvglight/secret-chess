import { definirCarta } from "../carta.ts";
import { DIAGONAIS, RETAS, type Direcao } from "../movimentos.ts";
import { casa, casasDasPecas, coluna, dentro, fileira } from "../tabuleiro.ts";
import type { Cor, Estado, Lance } from "../tipos.ts";

/** Continua o deslize depois de atravessar a primeira peça própria do caminho. */
function atravessando(estado: Estado, de: number, cor: Cor, direcoes: Direcao[], lances: Lance[]): void {
  const t = estado.tabuleiro;
  for (const [dc, df] of direcoes) {
    let col = coluna(de) + dc;
    let fil = fileira(de) + df;
    let atravessou = false;
    while (dentro(col, fil)) {
      const p = t[casa(col, fil)];
      if (!atravessou) {
        if (p && p.cor !== cor) break; // inimigo antes de qualquer peça própria: nada a atravessar
        if (p) atravessou = true;
      } else {
        if (p?.cor === cor) break;
        lances.push({ de, para: casa(col, fil) });
        if (p) break;
      }
      col += dc;
      fil += df;
    }
  }
}

export default definirCarta({
  id: "fantasma",
  nome: "Fantasma",
  tipo: "poder",
  peso: 3,
  descricao: "Suas torres e seus bispos podem atravessar uma peça sua no caminho.",

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const lances: Lance[] = [];
    for (const de of casasDasPecas(estado, dono, "torre")) atravessando(estado, de, dono, RETAS, lances);
    for (const de of casasDasPecas(estado, dono, "bispo")) atravessando(estado, de, dono, DIAGONAIS, lances);
    return lances;
  },
});
