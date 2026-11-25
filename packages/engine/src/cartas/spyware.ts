import { definirCarta } from "../carta.ts";

/**
 * Spyware: o adversário ganha uma desvantagem extra (sorteada no começo da partida)
 * e as duas desvantagens dele ficam à mostra para você. A desvantagem extra é posta
 * em criarPartida (e, no Draft, quem escolhe o Spyware fica sem poder: cartasDoDraft).
 */
export default definirCarta({
  id: "spyware",
  nome: "Spyware",
  tipo: "poder",
  peso: 4,
  descricao: "Seu adversário ganha uma desvantagem extra, e você vê as duas desvantagens dele.",
  foraDaMao: true,
});
