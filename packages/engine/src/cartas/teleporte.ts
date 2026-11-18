import { definirCarta } from "../carta.ts";
import { casasDasPecas, fileira, LETRA_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "teleporte",
  nome: "Teleporte",
  tipo: "poder",
  peso: 3,
  descricao: "Uma vez por partida, leve uma peça sua (menos o rei) para qualquer casa vazia da sua metade do tabuleiro.",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a peça e depois a casa vazia na sua metade",
    modo: "lance",
    lances({ estado, dono }) {
      const minhaMetade = (c: number) => (dono === "brancas" ? fileira(c) <= 3 : fileira(c) >= 4);
      const primeira = dono === "brancas" ? 0 : 7;
      const vazias = estado.tabuleiro.map((p, c) => (p ? -1 : c)).filter((c) => c >= 0 && minhaMetade(c));
      const lances: Lance[] = [];
      for (const de of casasDasPecas(estado, dono)) {
        const tipo = estado.tabuleiro[de]!.tipo;
        if (tipo === "rei") continue;
        for (const para of vazias) {
          // Peão na primeira fileira ficaria sem sentido.
          if (tipo === "peao" && fileira(para) === primeira) continue;
          lances.push({ de, para });
        }
      }
      return lances;
    },
    executar(ctx, lance) {
      const peca = ctx.estado.tabuleiro[lance.de]!;
      ctx.estado.tabuleiro[lance.para] = peca;
      ctx.estado.tabuleiro[lance.de] = null;
      const texto = `${LETRA_PECA[peca.tipo]}${nomeCasa(lance.de)}⇢${nomeCasa(lance.para)}`;
      ctx.registrar(`Teleportou: ${texto}`);
      return `${texto} (teleporte)`;
    },
  },
});
