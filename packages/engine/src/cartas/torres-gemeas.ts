import { definirCarta } from "../carta.ts";
import { contarPecas } from "../tabuleiro.ts";

/** Torres Gêmeas: se você perder uma torre, perde a outra junto. */
export default definirCarta({
  id: "torres-gemeas",
  nome: "Torres Gêmeas",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Se você perder uma das suas torres, a outra cai junto.",

  aoMover(ctx, { antes }) {
    const tinha = contarPecas(antes, ctx.dono, "torre");
    const tem = contarPecas(ctx.estado, ctx.dono, "torre");
    if (tinha < 2 || tem >= tinha || tem === 0) return;
    ctx.estado.tabuleiro = ctx.estado.tabuleiro.map((p) => (p?.tipo === "torre" && p.cor === ctx.dono ? null : p));
    ctx.registrar("Torres Gêmeas: perdeu uma torre e a outra caiu junto");
  },
});
