// Mensagens entre o navegador e o servidor nas partidas online (só tipos e constantes).
// Ficam no pacote do motor porque a web e o servidor usam as mesmas definições.
import type { DestaqueNoTabuleiro } from "./regras.ts";
import type { OfertaDraft } from "./draft.ts";
import type { Casa, CartasDoJogador, Cor, Estado, Lance } from "./tipos.ts";

export type RegrasOnline = "padrao" | "draft" | "mao" | "caos";

export interface ConfigSala {
  regras: RegrasOnline;
  /** Casas especiais (opção antiga; o menu agora oferece os airdrops). */
  casasEspeciais: boolean;
  /** Caixas com recompensa que caem durante a partida. */
  airdrops?: boolean;
  /** Minutos para cada lado (null = sem relógio). */
  minutos: 3 | 5 | 10 | null;
  /** A cor de quem cria a sala. */
  cor: Cor | "aleatoria";
}

/** O que o jogador faz na vez dele (o mesmo formato do replay). */
export type AcaoPartida =
  | { tipo: "carta"; indice: number }
  | { tipo: "poder"; alvo: Casa | null }
  | { tipo: "lance"; lance: Lance };

/** Wallhack: o que o jogador está olhando (peça selecionada, setas e marcações). */
export interface Espiada {
  selecionada: Casa | null;
  setas: { de: Casa; para: Casa }[];
  marcas: Casa[];
}

/** Multitasking: as palavras que o jogador tem que digitar e o que ele já digitou. */
export interface Digitacao {
  palavras: string;
  texto: string;
}

/** Reações prontas (não existe chat livre). */
export const REACOES = ["Boa!", "GG", "Uau!", "Ops!", "Bom jogo!", "Hmm…"] as const;
export type Reacao = (typeof REACOES)[number];

export type RespostaSala = { ok: true; codigo: string; token: string; cor: Cor } | { ok: false; erro: string };
export type RespostaAssistir = { ok: true; codigo: string } | { ok: false; erro: string };

/** Erro de quem tenta jogar numa sala cheia (a tela oferece assistir). */
export const ERRO_SALA_CHEIA = "A sala já tem dois jogadores.";

export type FaseSala = "aguardando" | "draft" | "jogando" | "fim";

/** O que um jogador vê da sala (o servidor monta uma vista para cada lado). */
export interface VistaSala {
  codigo: string;
  config: ConfigSala;
  /** Para o espectador, sempre "brancas" (só define o lado de baixo do tabuleiro). */
  minhaCor: Cor;
  /** Esta vista é de quem só assiste (não vê os segredos de nenhum dos lados). */
  espectador: boolean;
  /** Quantas pessoas estão assistindo. */
  espectadores: number;
  /** Conta as partidas da sala (muda na revanche). */
  numeroPartida: number;
  fase: FaseSala;
  jogadores: Record<Cor, { apelido: string; conectado: boolean } | null>;
  /** Estado como este jogador pode ver (sem os segredos do adversário). */
  estado: Estado | null;
  /** Destaques públicos e os segredos que este jogador pode ver (ex.: torre de vigia). */
  destaques: DestaqueNoTabuleiro[];
  /** Draft: as opções deste jogador e se cada lado já escolheu. */
  oferta: OfertaDraft | null;
  draftEscolhido: Record<Cor, boolean>;
  /** Draft: este jogador ainda pode usar o re-roll (trocar as opções uma vez). */
  rerollDisponivel: boolean;
  /** Draft, só para quem assiste: as opções dos dois e o que cada um já confirmou. */
  draftEspectador?: { ofertas: Record<Cor, OfertaDraft>; escolhas: Record<Cor, CartasDoJogador | null> } | null;
  /** Tempo restante (ms) no momento do envio e de quem é o relógio que está correndo. */
  relogio: { restante: Record<Cor, number>; correndo: Cor | null } | null;
  revanchePedida: Record<Cor, boolean>;
  /** No fim: o estado inicial e as ações, completos (para replay e estatísticas). */
  final: { inicial: Estado; acoes: AcaoPartida[] } | null;
}

/** Eventos que o navegador manda (com resposta quando precisa). */
export interface EventosDoCliente {
  criarSala(dados: { apelido: string; config: ConfigSala }, responder: (r: RespostaSala) => void): void;
  entrarSala(dados: { codigo: string; apelido: string; token?: string }, responder: (r: RespostaSala) => void): void;
  assistirSala(dados: { codigo: string }, responder: (r: RespostaAssistir) => void): void;
  escolherDraft(escolha: CartasDoJogador): void;
  /** Draft: troca as opções deste jogador (uma vez por partida). */
  rerolarDraft(): void;
  /** No fim da partida: larga a vaga de jogador (para depois assistir à sala). */
  virarEspectador(responder: (ok: boolean) => void): void;
  /** Wallhack: o que este jogador está olhando (o servidor só repassa a quem tem a carta). */
  espiar(dados: Espiada): void;
  /** Multitasking: o que este jogador está digitando (null = terminou). */
  digitando(dados: Digitacao | null): void;
  acao(acao: AcaoPartida): void;
  reagir(reacao: Reacao): void;
  desistir(): void;
  revanche(): void;
}

/** Eventos que o servidor manda. */
export interface EventosDoServidor {
  sala(vista: VistaSala): void;
  recusado(motivo: string): void;
  reacao(dados: { cor: Cor; reacao: Reacao }): void;
  /** Wallhack: o que o adversário está olhando. */
  espiada(dados: Espiada): void;
  /** Multitasking: o que um jogador está digitando (null = terminou). */
  digitacao(dados: { cor: Cor; digitacao: Digitacao | null }): void;
}
