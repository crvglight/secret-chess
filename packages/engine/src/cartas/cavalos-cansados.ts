import { definirCarta } from "../carta.ts";
import { casaDaPeca } from "../tabuleiro.ts";

interface Dados {
  /** Cavalos que se moveram na rodada atual do dono. */
  movidos: number[];
  /** Cavalos que se moveram na rodada anterior e agora descansam. */
  cansados: number[];
}

export default definirCarta<Dados>({
  id: "cavalos-cansados",
  nome: "Cavalos cansados",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Um cavalo seu que se moveu não pode se mover de novo na sua rodada seguinte.",
  dadosIniciais: () => ({ movidos: [], cansados: [] }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || dados.cansados.length === 0) return lances;
    return lances.filter((l) => !dados.cansados.includes(estado.tabuleiro[l.de]?.id ?? -1));
  },

  aoMover(ctx, { jogador, peca }) {
    if (jogador === ctx.dono && peca.tipo === "cavalo") ctx.dados.movidos = [...ctx.dados.movidos, peca.id];
  },

  inicioDoTurno(ctx, vez) {
    // A rodada do dono acabou: os cavalos que ele mexeu descansam na próxima.
    if (vez !== ctx.dono) {
      ctx.dados.cansados = ctx.dados.movidos;
      ctx.dados.movidos = [];
    }
  },

  destaques({ estado, dados }) {
    return dados.cansados
      .map((id) => casaDaPeca(estado, id))
      .filter((c): c is number => c !== null)
      .map((casa) => ({ casa, publico: true, rotulo: "Cansado" }));
  },
});
