import { definirCarta } from "../carta.ts";
import { VIZINHOS } from "../movimentos.ts";
import { casa, casaDaPeca, casasDasPecas, coluna, dentro, fileira, NOME_PECA, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  /** Peça com a bomba. */
  pecaId: number | null;
}

export default definirCarta<Dados>({
  id: "bomba",
  nome: "Bomba",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, marque em segredo uma peça sua: se ela for capturada, explode e leva junto quem capturou e as peças vizinhas (menos os reis).",
  dadosIniciais: () => ({ pecaId: null }),

  aoMover(ctx, { lance, captura }) {
    if (ctx.dados.pecaId === null || captura?.id !== ctx.dados.pecaId) return;
    const t = ctx.estado.tabuleiro;
    const centro = lance.para;
    const atingidas: string[] = [];
    const explodir = (c: number) => {
      const p = t[c];
      if (!p || p.tipo === "rei") return;
      atingidas.push(NOME_PECA[p.tipo]);
      t[c] = null;
    };
    explodir(centro);
    for (const [dc, df] of VIZINHOS) {
      const col = coluna(centro) + dc;
      const fil = fileira(centro) + df;
      if (dentro(col, fil)) explodir(casa(col, fil));
    }
    ctx.dados.pecaId = null;
    ctx.registrar(`A bomba explodiu em ${nomeCasa(centro)} e levou ${atingidas.length} peça(s)`);
  },

  destaques({ estado, dados }) {
    const c = dados.pecaId === null ? null : casaDaPeca(estado, dados.pecaId);
    return c === null ? [] : [{ casa: c, publico: false, rotulo: "Bomba" }];
  },

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a peça que vai carregar a bomba (só você vê)",
    modo: "alvo",
    alvosValidos: ({ estado, dono }) => casasDasPecas(estado, dono).filter((c) => estado.tabuleiro[c]!.tipo !== "rei"),
    usar(ctx, alvo) {
      ctx.dados.pecaId = ctx.estado.tabuleiro[alvo]!.id;
      ctx.registrar(`Pôs uma bomba no ${NOME_PECA[ctx.estado.tabuleiro[alvo]!.tipo]} de ${nomeCasa(alvo)}`);
    },
  },
});
