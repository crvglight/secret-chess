import { definirCarta } from "../carta.ts";
import { casasDasPecas } from "../tabuleiro.ts";

const MINIMO = 4;

export default definirCarta({
  id: "exercito-pequeno",
  nome: "Exército pequeno",
  tipo: "desvantagem",
  peso: 3,
  descricao: `Você perde se ficar com ${MINIMO} peças ou menos (contando o rei).`,

  condicaoDerrota: ({ estado, dono }) => casasDasPecas(estado, dono).length <= MINIMO,

  resumo: ({ estado, dono }) => `Peças: ${casasDasPecas(estado, dono).length} (perde com ${MINIMO})`,
});
