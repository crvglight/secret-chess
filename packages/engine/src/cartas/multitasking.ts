import { definirCarta } from "../carta.ts";

/**
 * Multitasking: para confirmar cada lance, digite as 3 palavras que aparecem em 7
 * segundos; errou ou acabou o tempo, o lance é anulado e você perde a vez (passarVez;
 * em xeque, só cancela o lance). A janela das palavras fica na tela do jogo (apps/web).
 */
export default definirCarta({
  id: "multitasking",
  nome: "Multitasking",
  tipo: "desvantagem",
  peso: 3,
  descricao:
    "A cada 2 lances seus, para confirmar o lance, digite sem erros as 3 palavras que aparecerem, em até 7 segundos. Se errar (ou o tempo acabar), o lance é anulado e você perde a vez.",

  resumo: ({ estado, dono }) =>
    (estado.lancesFeitos[dono] + 1) % 2 === 0 ? "este lance pede as palavras" : "o próximo lance pede as palavras",
});
