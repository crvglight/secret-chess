import { definirCarta } from "../carta.ts";
import { VIZINHOS } from "../movimentos.ts";
import { casa, casasDasPecas, coluna, dentro, fileira, nomeCasa } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "clone",
  nome: "Clone",
  tipo: "poder",
  peso: 2,
  descricao: "Uma vez por partida, crie uma cópia de um peão seu numa casa vizinha vazia (gasta o seu lance).",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha o peão e depois a casa vizinha da cópia",
    modo: "lance",
    lances({ estado, dono }) {
      const lances: Lance[] = [];
      for (const de of casasDasPecas(estado, dono, "peao")) {
        for (const [dc, df] of VIZINHOS) {
          const col = coluna(de) + dc;
          const fil = fileira(de) + df;
          // Peão não pode ficar na primeira nem na última fileira.
          if (!dentro(col, fil) || fil === 0 || fil === 7) continue;
          const para = casa(col, fil);
          if (!estado.tabuleiro[para]) lances.push({ de, para });
        }
      }
      return lances;
    },
    executar(ctx, lance) {
      ctx.estado.tabuleiro[lance.para] = { id: 1000 + ctx.estado.meioLance * 4 + 1, tipo: "peao", cor: ctx.dono };
      ctx.registrar(`Clonou o peão de ${nomeCasa(lance.de)} em ${nomeCasa(lance.para)}`);
      return `${nomeCasa(lance.de)}+${nomeCasa(lance.para)} (clone)`;
    },
  },
});
