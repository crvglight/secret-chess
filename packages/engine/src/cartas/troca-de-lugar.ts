import { definirCarta } from "../carta.ts";
import { casasDasPecas, fileira, LETRA_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "troca-de-lugar",
  nome: "Troca de lugar",
  tipo: "poder",
  peso: 2,
  descricao: "Uma vez por partida, duas peças suas trocam de lugar (isso gasta o seu lance).",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha uma peça e depois a outra peça sua",
    modo: "lance",
    lances({ estado, dono }) {
      const casas = casasDasPecas(estado, dono);
      const ponta = (c: number) => fileira(c) === 0 || fileira(c) === 7;
      const lances: Lance[] = [];
      for (const de of casas) {
        for (const para of casas) {
          const a = estado.tabuleiro[de]!.tipo;
          const b = estado.tabuleiro[para]!.tipo;
          if (de === para || a === b) continue;
          // Peão não pode parar na primeira nem na última fileira.
          if ((a === "peao" && ponta(para)) || (b === "peao" && ponta(de))) continue;
          lances.push({ de, para });
        }
      }
      return lances;
    },
    executar(ctx, lance) {
      const t = ctx.estado.tabuleiro;
      const a = t[lance.de]!;
      const b = t[lance.para]!;
      t[lance.de] = b;
      t[lance.para] = a;
      const texto = `${LETRA_PECA[a.tipo] || "P"}${nomeCasa(lance.de)}⇄${LETRA_PECA[b.tipo] || "P"}${nomeCasa(lance.para)}`;
      ctx.registrar(`Trocou de lugar: ${texto}`);
      return `${texto} (troca)`;
    },
  },
});
