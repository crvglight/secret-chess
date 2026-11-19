// Motor do Secret Chess: puro, sem React e sem rede.

export const VERSAO_MOTOR = "0.2.0";

export * from "./tipos.ts";
export * from "./carta.ts";
export * from "./tabuleiro.ts";
export { gerarLancesBase, PROMOCOES } from "./movimentos.ts";
export * from "./regras.ts";
export * from "./sorteio.ts";
export * from "./draft.ts";
export * from "./mao.ts";
export * from "./eventos.ts";
export * from "./casas.ts";
export * from "./personalizadas.ts";
export * from "./protocolo.ts";
export * from "./stockfish.ts";
export {
  analisarAoVivo,
  analisarPosicao,
  escolherJogada,
  executarJogada,
  NIVEIS,
  ocultarCartasDe,
  textoJogada,
  type Analise,
  type JogadaIA,
  type LanceAnalisado,
  type NivelIA,
} from "./ia/busca.ts";
export { avaliar } from "./ia/avaliacao.ts";
export { CARTAS_OFICIAIS, obterCarta, registrarCarta } from "./cartas/index.ts";
