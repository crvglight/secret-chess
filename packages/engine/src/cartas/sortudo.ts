import { definirCarta } from "../carta.ts";

/** Sortudo: a desvantagem que não atrapalha nada. */
export default definirCarta({
  id: "sortudo",
  nome: "Sortudo",
  tipo: "desvantagem",
  peso: 1,
  descricao: "Você foi abençoado pelos deuses do xadrez: não há desvantagem.",
});
