import { definirCarta } from "../carta.ts";
import type { Estado } from "../tipos.ts";

interface Dados {
  /** O estado antes do seu último lance (sem a própria foto, para não acumular). */
  foto: Estado | null;
}

export default definirCarta<Dados>({
  id: "segunda-chance",
  nome: "Segunda chance",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, depois do lance do adversário, volte o tabuleiro para antes do seu último lance e jogue outro.",
  dadosIniciais: () => ({ foto: null }),

  aoMover(ctx, { jogador, antes }) {
    if (jogador !== ctx.dono || ctx.estado.usosPoder[ctx.dono] <= 0) return;
    const meus = antes.dadosCartas[ctx.dono];
    ctx.dados.foto = {
      ...antes,
      dadosCartas: { ...antes.dadosCartas, [ctx.dono]: { ...meus, poder: { ...meus.poder, foto: null } } },
    };
  },

  acaoAtiva: {
    usos: 1,
    instrucao: "Desfazer",
    modo: "imediato",
    bloqueio: ({ dados }) => (dados.foto ? null : "Ainda não há lance seu para desfazer"),
    usar(ctx) {
      const foto = ctx.dados.foto!;
      const eventos = ctx.estado.eventos;
      Object.assign(ctx.estado, foto, {
        eventos,
        tabuleiro: foto.tabuleiro.slice(),
        historico: foto.historico.slice(),
        usosPoder: { ...foto.usosPoder },
        dadosCartas: {
          ...foto.dadosCartas,
          [ctx.dono]: { ...foto.dadosCartas[ctx.dono], poder: { foto: null } },
        },
      });
      ctx.registrar("Voltou atrás no próprio lance e no do adversário");
    },
  },
});
