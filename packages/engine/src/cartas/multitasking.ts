import { definirCarta } from "../carta.ts";

/**
 * Multitasking: para confirmar cada lance, digite as 3 palavras que aparecem em 8
 * segundos; errou ou acabou o tempo, o lance não acontece (e você tenta de novo).
 * A regra fica na tela do jogo (apps/web); o motor não muda nada.
 */
export default definirCarta({
  id: "multitasking",
  nome: "Multitasking",
  tipo: "desvantagem",
  peso: 3,
  descricao:
    "Para confirmar cada lance, digite sem erros as 3 palavras que aparecerem, em até 8 segundos. Se errar, o lance não acontece.",
});
