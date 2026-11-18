import { definirCarta } from "../carta.ts";
import { contarPecas } from "../tabuleiro.ts";

export default definirCarta({
  id: "dama-fragil",
  nome: "Dama frágil",
  tipo: "desvantagem",
  peso: 4,
  descricao: "Você perde se ficar sem nenhuma dama no tabuleiro.",

  condicaoDerrota: ({ estado, dono }) => contarPecas(estado, dono, "dama") === 0,
});
