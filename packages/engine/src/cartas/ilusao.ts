import { definirCarta } from "../carta.ts";
import { casaDaPeca, casasDasPecas, NOME_PECA, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  /** Peça disfarçada de peão (até se mover). */
  pecaId: number | null;
}

export default definirCarta<Dados>({
  id: "ilusao",
  nome: "Ilusão",
  tipo: "poder",
  peso: 2,
  descricao: "Uma vez por partida, uma peça sua (menos o rei) parece um peão para o adversário até se mover.",
  dadosIniciais: () => ({ pecaId: null }),

  aoMover(ctx, { jogador, peca }) {
    if (jogador === ctx.dono && peca.id === ctx.dados.pecaId) {
      ctx.dados.pecaId = null;
      ctx.registrar(`A ilusão acabou: era um ${NOME_PECA[peca.tipo]}`);
    }
  },

  disfarces({ estado, dados }) {
    const casa = dados.pecaId === null ? null : casaDaPeca(estado, dados.pecaId);
    return casa === null ? [] : [{ casa, tipo: "peao" }];
  },

  destaques({ estado, dados }) {
    const casa = dados.pecaId === null ? null : casaDaPeca(estado, dados.pecaId);
    return casa === null ? [] : [{ casa, publico: false, rotulo: "Disfarçada" }];
  },

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a peça que vai parecer um peão",
    modo: "alvo",
    alvosValidos: ({ estado, dono }) =>
      casasDasPecas(estado, dono).filter((c) => !["rei", "peao"].includes(estado.tabuleiro[c]!.tipo)),
    // A busca da IA enxerga tudo: disfarçar não muda a conta dela.
    alvosParaIA: () => [],
    usar(ctx, alvo) {
      const peca = ctx.estado.tabuleiro[alvo]!;
      ctx.dados.pecaId = peca.id;
      ctx.registrar(`Disfarçou o ${NOME_PECA[peca.tipo]} de ${nomeCasa(alvo)} de peão`);
    },
  },
});
