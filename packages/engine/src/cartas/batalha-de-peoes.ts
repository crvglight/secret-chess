import { definirCarta } from "../carta.ts";
import { contarPecas, corOposta } from "../tabuleiro.ts";

export default definirCarta({
  id: "batalha-de-peoes",
  nome: "Batalha de peões",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Você perde se tiver menos peões que o adversário.",

  condicaoDerrota: ({ estado, dono }) =>
    contarPecas(estado, dono, "peao") < contarPecas(estado, corOposta(dono), "peao"),
});
