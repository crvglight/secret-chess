import { definirCarta } from "../carta.ts";
import { nomeCasa } from "../tabuleiro.ts";

interface Dados {
  /** armado = o jogador escolheu o cavalo; segundo = falta o segundo salto. */
  fase: "armado" | "segundo" | null;
  pecaId: number | null;
}

export default definirCarta<Dados>({
  id: "cavalo-saltador",
  nome: "Cavalo saltador",
  tipo: "poder",
  peso: 3,
  descricao: "Duas vezes por partida, um cavalo seu pode fazer dois lances seguidos.",
  dadosIniciais: () => ({ fase: null, pecaId: null }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || dados.fase === null) return lances;
    return lances.filter((l) => estado.tabuleiro[l.de]?.id === dados.pecaId);
  },

  aoMover(ctx, { jogador, lance }) {
    if (jogador !== ctx.dono) return;
    if (ctx.dados.fase === "armado") {
      ctx.dados.fase = "segundo";
      // Só dá o segundo salto se o cavalo tiver para onde ir.
      if (ctx.lancesLegais(ctx.dono).length > 0) {
        ctx.estado.repetirVez = true;
        ctx.registrar(`O cavalo saltou para ${nomeCasa(lance.para)} e vai saltar de novo`);
        return;
      }
    }
    ctx.dados.fase = null;
    ctx.dados.pecaId = null;
  },

  acaoAtiva: {
    usos: 2,
    instrucao: "Escolha o cavalo que vai fazer dois lances",
    modo: "alvo",
    alvosValidos({ estado, dono, lancesLegais }) {
      const casas = lancesLegais(dono)
        .filter((l) => estado.tabuleiro[l.de]?.tipo === "cavalo")
        .map((l) => l.de);
      return [...new Set(casas)];
    },
    usar(ctx, alvo) {
      ctx.dados.fase = "armado";
      ctx.dados.pecaId = ctx.estado.tabuleiro[alvo]!.id;
      ctx.registrar(`Ativou o cavalo em ${nomeCasa(alvo)}`);
    },
  },
});
