import { definirCarta } from "../carta.ts";

const PRAZO = 12;

interface Dados {
  semCapturar: number;
}

export default definirCarta<Dados>({
  id: "prazo",
  nome: "Prazo",
  tipo: "desvantagem",
  peso: 3,
  descricao: `Você perde se fizer ${PRAZO} lances seguidos sem capturar nada.`,
  dadosIniciais: () => ({ semCapturar: 0 }),

  aoMover(ctx, { jogador, captura }) {
    if (jogador === ctx.dono) ctx.dados.semCapturar = captura ? 0 : ctx.dados.semCapturar + 1;
  },

  condicaoDerrota: ({ dados }) => dados.semCapturar >= PRAZO,

  resumo: ({ dados }) => `Capture em até ${PRAZO - dados.semCapturar} lance(s)`,
});
