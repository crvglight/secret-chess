import { definirCarta } from "../carta.ts";

/**
 * Wallhack: você vê a peça que o adversário seleciona e as setas/marcações dele.
 * Só faz sentido online (o servidor repassa a tela dele para você).
 */
export default definirCarta({
  id: "wallhack",
  nome: "Wallhack",
  tipo: "poder",
  peso: 2,
  descricao: "Você vê a peça que o adversário seleciona e as setas e marcações dele no tabuleiro, o tempo todo.",
  exigeOnline: true,
  foraDoDraft: true,
  foraDaMao: true,
});
