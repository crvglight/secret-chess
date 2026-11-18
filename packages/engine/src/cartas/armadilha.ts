import { definirCarta } from "../carta.ts";
import { NOME_PECA, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  casa: number | null;
}

export default definirCarta<Dados>({
  id: "armadilha",
  nome: "Armadilha",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, marque em segredo uma casa vazia: a peça do adversário que parar ali é capturada (o rei escapa).",
  dadosIniciais: () => ({ casa: null }),

  aoMover(ctx, { jogador, lance }) {
    if (jogador === ctx.dono || ctx.dados.casa !== lance.para) return;
    const peca = ctx.estado.tabuleiro[lance.para];
    if (!peca || peca.tipo === "rei") return;
    ctx.estado.tabuleiro[lance.para] = null;
    ctx.dados.casa = null;
    ctx.registrar(`A armadilha em ${nomeCasa(lance.para)} capturou o ${NOME_PECA[peca.tipo]}`);
  },

  destaques: ({ dados }) => (dados.casa === null ? [] : [{ casa: dados.casa, publico: false, rotulo: "Armadilha" }]),

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a casa vazia da armadilha (só você vê)",
    modo: "alvo",
    alvosValidos: ({ estado }) => estado.tabuleiro.map((p, c) => (p ? -1 : c)).filter((c) => c >= 0),
    // A busca supõe que o adversário vê tudo e nunca cairia: a IA não usa este poder.
    alvosParaIA: () => [],
    usar(ctx, alvo) {
      ctx.dados.casa = alvo;
      ctx.registrar(`Armou uma armadilha em ${nomeCasa(alvo)}`);
    },
  },
});
