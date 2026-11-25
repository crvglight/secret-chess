import { definirCarta } from "../carta.ts";

/** Sortudo: a desvantagem que não atrapalha nada. */
export default definirCarta({
  id: "sortudo",
  nome: "Sortudo",
  tipo: "desvantagem",
  peso: 1,
  // Sai bem menos que as outras (o peso 1 é só para o equilíbrio do sorteio).
  raridade: 0.25,
  descricao: "Você foi abençoado pelos deuses do xadrez: não há desvantagem.",
});
