import { definirCarta } from "../carta.ts";

interface Dados {
  /** armado = o próximo lance tem que ser de peão; segundo = falta o peão do segundo lance. */
  fase: "armado" | "segundo" | null;
  /** O peão do primeiro lance (não pode repetir). */
  primeiroId: number | null;
}

export default definirCarta<Dados>({
  id: "avanco-em-massa",
  nome: "Avanço em massa",
  tipo: "poder",
  peso: 2,
  descricao: "Duas vezes por partida, mova dois peões diferentes no mesmo turno.",
  dadosIniciais: () => ({ fase: null, primeiroId: null }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || dados.fase === null) return lances;
    return lances.filter((l) => {
      const p = estado.tabuleiro[l.de];
      return !l.poder && p?.tipo === "peao" && p.id !== dados.primeiroId;
    });
  },

  aoMover(ctx, { jogador, peca }) {
    if (jogador !== ctx.dono) return;
    if (ctx.dados.fase === "armado") {
      ctx.dados.fase = "segundo";
      ctx.dados.primeiroId = peca.id;
      if (ctx.lancesLegais(ctx.dono).length > 0) {
        ctx.estado.repetirVez = true;
        return;
      }
    }
    ctx.dados.fase = null;
    ctx.dados.primeiroId = null;
  },

  acaoAtiva: {
    usos: 2,
    instrucao: "Mova o primeiro peão",
    modo: "imediato",
    bloqueio({ estado, dono, lancesLegais }) {
      const peoes = new Set(
        lancesLegais(dono)
          .filter((l) => estado.tabuleiro[l.de]?.tipo === "peao")
          .map((l) => l.de),
      );
      return peoes.size >= 2 ? null : "Precisa de dois peões que possam andar";
    },
    usar(ctx) {
      ctx.dados.fase = "armado";
      ctx.registrar("Começou um avanço em massa");
    },
  },
});
