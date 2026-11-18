import { definirCarta } from "../carta.ts";
import { casaDaPeca, casasDasPecas, corOposta, NOME_PECA, nomeCasa, pecaCapturada } from "../tabuleiro.ts";
import { VALOR_PECA } from "../ia/avaliacao.ts";

interface Dados {
  pecaId: number | null;
}

export default definirCarta<Dados>({
  id: "congelar",
  nome: "Congelar",
  tipo: "poder",
  peso: 3,
  descricao: "Uma vez por partida, escolha uma peça do adversário (menos o rei): ela não pode se mover na próxima rodada dele.",
  dadosIniciais: () => ({ pecaId: null }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador === dono || dados.pecaId === null) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.id !== dados.pecaId);
  },

  inicioDoTurno(ctx, vez) {
    if (vez === ctx.dono) ctx.dados.pecaId = null;
  },

  destaques({ estado, dados }) {
    const casa = dados.pecaId === null ? null : casaDaPeca(estado, dados.pecaId);
    return casa === null ? [] : [{ casa, publico: true, rotulo: "Congelada" }];
  },

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a peça do adversário que vai congelar",
    modo: "alvo",
    alvosValidos: ({ estado, dono }) =>
      casasDasPecas(estado, corOposta(dono)).filter((c) => estado.tabuleiro[c]!.tipo !== "rei"),
    alvosParaIA({ estado, dono, lancesLegais }) {
      // As peças do adversário que podem capturar algo agora, das mais valiosas.
      const atacantes = new Set(
        lancesLegais(corOposta(dono))
          .filter((l) => pecaCapturada(estado, l) && estado.tabuleiro[l.de]!.tipo !== "rei")
          .map((l) => l.de),
      );
      return [...atacantes]
        .sort((a, b) => VALOR_PECA[estado.tabuleiro[b]!.tipo] - VALOR_PECA[estado.tabuleiro[a]!.tipo])
        .slice(0, 3);
    },
    usar(ctx, alvo) {
      const peca = ctx.estado.tabuleiro[alvo]!;
      ctx.dados.pecaId = peca.id;
      ctx.registrar(`Congelou o ${NOME_PECA[peca.tipo]} em ${nomeCasa(alvo)}`);
    },
  },
});
