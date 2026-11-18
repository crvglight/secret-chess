import { definirCarta } from "../carta.ts";
import { casaDaPeca, casasDasPecas, NOME_PECA, nomeCasa, pecaCapturada } from "../tabuleiro.ts";

interface Dados {
  /** Peça protegida (segue a peça mesmo se ela se mover). */
  pecaId: number | null;
}

export default definirCarta<Dados>({
  id: "escudo",
  nome: "Escudo",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, escolha uma peça sua: ela não pode ser capturada na próxima rodada do adversário.",
  dadosIniciais: () => ({ pecaId: null }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador === dono || dados.pecaId === null) return lances;
    return lances.filter((l) => pecaCapturada(estado, l)?.id !== dados.pecaId);
  },

  inicioDoTurno(ctx, vez) {
    if (vez === ctx.dono) ctx.dados.pecaId = null;
  },

  destaques({ estado, dados }) {
    const casa = dados.pecaId === null ? null : casaDaPeca(estado, dados.pecaId);
    return casa === null ? [] : [{ casa, publico: true, rotulo: "Protegida" }];
  },

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha uma peça sua para proteger",
    modo: "alvo",
    alvosValidos: ({ estado, dono }) => casasDasPecas(estado, dono),
    usar(ctx, alvo) {
      const peca = ctx.estado.tabuleiro[alvo]!;
      ctx.dados.pecaId = peca.id;
      ctx.registrar(`Protegeu o ${NOME_PECA[peca.tipo]} em ${nomeCasa(alvo)}`);
    },
  },
});
