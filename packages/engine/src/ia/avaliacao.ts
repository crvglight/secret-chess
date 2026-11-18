import { coluna, fileira } from "../tabuleiro.ts";
import type { Cor, Estado, TipoPeca } from "../tipos.ts";

export const VALOR_PECA: Record<TipoPeca, number> = {
  peao: 100,
  cavalo: 300,
  bispo: 320,
  torre: 500,
  dama: 900,
  // O rei não entra no material: perder o rei é o fim da partida, tratado na busca.
  rei: 0,
};

/** Bispo que não captura vale bem menos. */
const VALOR_BISPO_TIMIDO = 200;

/** 0 nas bordas, 3 nas 4 casas centrais. */
function centralidade(c: number): number {
  return 3 - Math.max(Math.abs(coluna(c) - 3.5), Math.abs(fileira(c) - 3.5)) + 0.5;
}

/** Quantas fileiras a peça andou desde o próprio lado do tabuleiro. */
function avanco(c: number, cor: Cor): number {
  return cor === "brancas" ? fileira(c) : 7 - fileira(c);
}

/** Avaliação estática em centipeões, do ponto de vista de `cor`. */
export function avaliar(estado: Estado, cor: Cor): number {
  let damas = 0;
  for (const p of estado.tabuleiro) if (p?.tipo === "dama") damas++;
  const abertura = damas > 0;

  let total = 0;
  estado.tabuleiro.forEach((p, c) => {
    if (!p) return;
    let v = VALOR_PECA[p.tipo];
    if (p.tipo === "bispo" && estado.cartas[p.cor].desvantagem === "bispos-timidos") v = VALOR_BISPO_TIMIDO;

    switch (p.tipo) {
      case "peao":
        v += avanco(c, p.cor) * 6 + (centralidade(c) > 2 ? 8 : 0);
        break;
      case "cavalo":
      case "bispo":
        v += centralidade(c) * 10;
        break;
      case "dama":
        v += centralidade(c) * 3;
        break;
      case "rei":
        // Sem xeque, um rei exposto é muito perigoso enquanto houver damas.
        v -= abertura ? avanco(c, p.cor) * 25 : -centralidade(c) * 5;
        break;
      default:
        break;
    }
    total += p.cor === cor ? v : -v;
  });
  return total;
}
