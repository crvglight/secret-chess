// Comunicação entre a aba do jogo e a janela de análise (só no modo de desenvolvimento).
import type { Cor, Estado } from "@xadrez/engine";

export const NOME_CANAL = "xadrez-analise";
export const NOME_JANELA = "xadrez-analise";

export interface DadosPartida {
  estado: Estado;
  orientacao: Cor;
}

export type MensagemCanal = ({ tipo: "estado" } & DadosPartida) | { tipo: "pedir" };
