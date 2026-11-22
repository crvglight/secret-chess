import { definirCarta } from "../carta.ts";
import { contarPecas, corOposta } from "../tabuleiro.ts";

/** Diferença de peões (a menos que o adversário) que faz perder. */
const DIFERENCA = 4;

export default definirCarta({
  id: "batalha-de-peoes",
  nome: "Batalha de peões",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Você perde se tiver 4 peões a menos que o adversário.",

  condicaoDerrota: ({ estado, dono }) =>
    contarPecas(estado, corOposta(dono), "peao") - contarPecas(estado, dono, "peao") >= DIFERENCA,

  resumo: ({ estado, dono }) => {
    const diferenca = contarPecas(estado, corOposta(dono), "peao") - contarPecas(estado, dono, "peao");
    return diferenca > 0 ? `${diferenca} peão(ões) a menos (perde com ${DIFERENCA})` : null;
  },
});
