export type Cor = "brancas" | "pretas";
export const CORES: readonly Cor[] = ["brancas", "pretas"];

export type TipoPeca = "peao" | "cavalo" | "bispo" | "torre" | "dama" | "rei";

export interface Peca {
  readonly id: number;
  readonly tipo: TipoPeca;
  readonly cor: Cor;
}

/** Índice de 0 a 63: a1 = 0, h1 = 7, a8 = 56, h8 = 63. */
export type Casa = number;

export type Especial = "duplo" | "en-passant" | "roque-curto" | "roque-longo";

export interface Lance {
  de: Casa;
  para: Casa;
  promocao?: TipoPeca;
  especial?: Especial;
  /** Id da carta, quando o lance é um poder (ex.: teleporte). */
  poder?: string;
}

export type SlotCarta = "poder" | "desvantagem";
export type CartasDoJogador = Record<SlotCarta, string | null>;
export type DadosCarta = Record<string, unknown>;

export interface RegistroLance {
  cor: Cor;
  lance: Lance;
  peca: TipoPeca;
  captura: TipoPeca | null;
  texto: string;
}

/** Momento em que uma carta pesou na partida (mostrado na tela de fim). */
export interface EventoCarta {
  /** Meio-lance em que aconteceu (0 = primeiro lance das brancas). */
  meioLance: number;
  cor: Cor;
  cartaId: string;
  texto: string;
}

export type MotivoFim =
  | "rei-capturado"
  | "xeque-mate"
  /** Sem lance e fora do xeque: empate. */
  | "afogamento"
  | "sem-lances"
  | "carta"
  | "50-lances"
  | "limite"
  // Só no online:
  | "tempo"
  | "abandono"
  | "desistencia";

export interface Resultado {
  /** null = empate */
  vencedor: Cor | null;
  motivo: MotivoFim;
  cartaId?: string;
}

/** Estado completo da partida. É só dados (JSON), para ir ao Web Worker e pela rede. */
export interface Estado {
  tabuleiro: (Peca | null)[];
  vez: Cor;
  roque: Record<Cor, { curto: boolean; longo: boolean }>;
  enPassant: Casa | null;
  /** Total de lances já feitos pelos dois lados. */
  meioLance: number;
  /** Meios-lances desde a última captura ou lance de peão (regra dos 50 lances). */
  semProgresso: number;
  lancesFeitos: Record<Cor, number>;
  cartas: Record<Cor, CartasDoJogador>;
  dadosCartas: Record<Cor, Record<SlotCarta, DadosCarta>>;
  usosPoder: Record<Cor, number>;
  poderUsadoNoTurno: boolean;
  /** Uma carta pode ligar isto em aoMover para o mesmo jogador lançar de novo. */
  repetirVez: boolean;
  historico: RegistroLance[];
  eventos: EventoCarta[];
  resultado: Resultado | null;
  /** Só no modo Mão de cartas. */
  mao?: MaoDeCartas;
  /** Só no modo Caos. */
  caos?: EstadoCaos;
  /** Só com a opção de casas especiais. */
  casas?: EstadoCasas;
}

export type TipoCasaEspecial =
  | "portal"
  | "lama"
  | "bau"
  | "muralha"
  | "gelo"
  | "trampolim"
  | "vigia"
  | "santuario"
  | "forja"
  | "vulcao"
  | "esteira"
  | "espelho"
  | "areia"
  | "altar"
  | "nevoa"
  | "sorte";

export interface CasaEspecial {
  casa: Casa;
  tipo: TipoCasaEspecial;
  /** Esteira: para que lado empurra (1 = rumo à coluna h, -1 = rumo à coluna a). */
  direcao?: 1 | -1;
}

/** Casas especiais do tabuleiro (portal, lama, baú, muralha). */
export interface EstadoCasas {
  lista: CasaEspecial[];
  /** Peças atoladas na lama: não se movem enquanto meioLance < ate. */
  presas: { pecaId: number; ate: number }[];
  /** Peças que passaram pelo trampolim: podem pular 2 casas enquanto meioLance < ate. */
  trampolim?: { pecaId: number; ate: number }[];
  /** Peças paradas na areia movediça e desde quando. */
  areia?: { pecaId: number; casa: Casa; desde: number }[];
  /** O que as casas fizeram (para avisar na tela). */
  registro: { meioLance: number; cor: Cor; texto: string }[];
}

/** Modo Caos: eventos globais sorteados no início e disparados a cada poucos lances. */
export interface EstadoCaos {
  /** Ids dos eventos, na ordem em que vão acontecer. */
  sequencia: string[];
  /** Posição do próximo evento na sequência. */
  indice: number;
  /** Evento em vigor e o meio-lance em que ele acaba. */
  ativo: { id: string; ate: number } | null;
  /** Eventos que já aconteceram (para a tela de fim). */
  registro: { meioLance: number; id: string }[];
}

/** Modo Mão de cartas: cartas de poder de uso único, compradas durante a partida. */
export interface MaoDeCartas {
  /** Cartas na mão de cada lado (ids de poderes). */
  mao: Record<Cor, string[]>;
  /** Próximas cartas a comprar, na ordem. */
  baralho: Record<Cor, string[]>;
  /** A carta que cada lado jogou nesta rodada (fica em jogo até a próxima vez dele). */
  jogada: Record<Cor, string | null>;
}
