import { definirCarta } from "../carta.ts";
import { distancia, NOME_PECA, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  /** Casas já andadas pelas suas peças. */
  gasto: number;
}

/** Orçamento total de casas de movimento. */
export const ORCAMENTO = 100;

function sorte(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/**
 * Salário Mínimo: suas peças têm 100 casas de movimento no total (cada lance custa a
 * distância andada). Acabou o orçamento, você perde uma peça (ao acaso) a cada vez sua,
 * até sobrar só o rei.
 */
export default definirCarta<Dados>({
  id: "salario-minimo",
  nome: "Salário Mínimo",
  tipo: "desvantagem",
  peso: 3,
  descricao:
    "Você tem um orçamento de 100 casas de movimento (cada lance gasta as casas andadas). Quando acabar, você perde uma peça a cada vez sua, até sobrar só o rei.",
  dadosIniciais: () => ({ gasto: 0 }),

  aoMover(ctx, { jogador, lance }) {
    if (jogador !== ctx.dono) return;
    ctx.dados.gasto += Math.max(1, distancia(lance.de, lance.para));
  },

  inicioDoTurno(ctx, vez) {
    if (vez !== ctx.dono || ctx.dados.gasto < ORCAMENTO) return;
    const t = ctx.estado.tabuleiro;
    const pecas = t.map((p, c) => (p && p.cor === ctx.dono && p.tipo !== "rei" ? c : -1)).filter((c) => c >= 0);
    if (pecas.length === 0) return;
    const casa = pecas[Math.floor(sorte(ctx.estado.meioLance) * pecas.length)]!;
    const peca = t[casa]!;
    t[casa] = null;
    ctx.registrar(`Salário Mínimo: sem orçamento, perdeu o ${NOME_PECA[peca.tipo]} de ${nomeCasa(casa)}`);
  },

  resumo: ({ dados }) => {
    const sobra = ORCAMENTO - dados.gasto;
    return sobra > 0 ? `orçamento: ${sobra} de ${ORCAMENTO} casas` : "orçamento acabou: perde uma peça por vez";
  },
});
