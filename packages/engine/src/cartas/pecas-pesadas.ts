import { definirCarta } from "../carta.ts";
import { casaDaPeca } from "../tabuleiro.ts";

interface Dados {
  /** Peças que o dono moveu na rodada atual. */
  movidas: number[];
  /** Peças que ele moveu na rodada anterior (agora não podem se mover). */
  pesadas: number[];
}

export default definirCarta<Dados>({
  id: "pecas-pesadas",
  nome: "Peças pesadas",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Você não pode mover a mesma peça em duas rodadas seguidas.",
  dadosIniciais: () => ({ movidas: [], pesadas: [] }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || dados.pesadas.length === 0) return lances;
    return lances.filter((l) => !dados.pesadas.includes(estado.tabuleiro[l.de]?.id ?? -1));
  },

  aoMover(ctx, { jogador, peca }) {
    if (jogador === ctx.dono) ctx.dados.movidas = [...ctx.dados.movidas, peca.id];
  },

  inicioDoTurno(ctx, vez) {
    // A rodada do dono acabou: o que ele moveu fica pesado na próxima.
    if (vez !== ctx.dono) {
      ctx.dados.pesadas = ctx.dados.movidas;
      ctx.dados.movidas = [];
    }
  },

  destaques({ estado, dados }) {
    return dados.pesadas
      .map((id) => casaDaPeca(estado, id))
      .filter((c): c is number => c !== null)
      .map((casa) => ({ casa, publico: true, rotulo: "Pesada" }));
  },
});
