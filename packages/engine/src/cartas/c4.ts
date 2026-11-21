import { definirCarta } from "../carta.ts";
import { casaDoNome, NOME_PECA, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  /** Já explodiu alguma vez (aí a casa deixa de ser segredo). */
  descoberta: boolean;
}

/** A casa da mina: sempre c4, para as brancas e para as pretas. */
export const CASA_DO_C4 = casaDoNome("c4");

export default definirCarta<Dados>({
  id: "c4",
  nome: "C4",
  tipo: "poder",
  peso: 3,
  descricao:
    "A casa c4 é uma mina secreta: a peça do adversário que parar nela explode (o rei escapa). Vale a partida toda.",
  dadosIniciais: () => ({ descoberta: false }),

  aoMover(ctx, { jogador, lance }) {
    if (jogador === ctx.dono) return;
    const c = CASA_DO_C4;
    if (lance.para !== c) return;
    const peca = ctx.estado.tabuleiro[c];
    if (!peca || peca.cor === ctx.dono || peca.tipo === "rei") return;
    ctx.estado.tabuleiro[c] = null;
    ctx.dados.descoberta = true;
    ctx.registrar(`C4: o ${NOME_PECA[peca.tipo]} do adversário explodiu em ${nomeCasa(c)}`);
  },

  destaques: ({ dados }) => [{ casa: CASA_DO_C4, publico: dados.descoberta, rotulo: "C4" }],
});
