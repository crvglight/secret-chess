import type { Casa, Cor, Estado, Lance, Peca, TipoPeca } from "./tipos.ts";

export type TipoCarta = "poder" | "desvantagem";

/** Contexto só de leitura: usado ao gerar lances e checar derrota. Não altere nada aqui. */
export interface ContextoLeitura<D> {
  readonly estado: Estado;
  readonly dono: Cor;
  readonly dados: Readonly<D>;
}

/** Contexto de consulta: pode pedir os lances legais (não use dentro de filtrarLances). */
export interface ContextoConsulta<D> extends ContextoLeitura<D> {
  lancesLegais(cor: Cor): Lance[];
}

/** Contexto de escrita: o estado já é uma cópia nova e pode ser alterado. */
export interface ContextoEscrita<D> {
  estado: Estado;
  dono: Cor;
  dados: D;
  lancesLegais(cor: Cor): Lance[];
  /** Registra um momento em que a carta pesou (aparece na tela de fim). */
  registrar(texto: string): void;
}

export interface InfoLance {
  jogador: Cor;
  lance: Lance;
  /** A peça que se moveu, como estava antes do lance. */
  peca: Peca;
  captura: Peca | null;
  /** O estado antes do lance (não altere). */
  antes: Estado;
}

interface AcaoBase<D> {
  /** Quantas vezes pode ser usada na partida. */
  usos: number;
  /** Instrução mostrada ao jogador quando ele aperta "Usar poder". */
  instrucao: string;
  /** Motivo para o poder estar apagado agora, ou null se pode usar. */
  bloqueio?(ctx: ContextoConsulta<D>): string | null;
}

/** O jogador escolhe uma casa e o efeito acontece; depois ele ainda faz o lance. */
export interface AcaoComAlvo<D> extends AcaoBase<D> {
  modo: "alvo";
  alvosValidos(ctx: ContextoConsulta<D>): Casa[];
  /** Alvos que a IA deve testar (a busca fica cara com muitos alvos). [] = a IA não usa. */
  alvosParaIA?(ctx: ContextoConsulta<D>): Casa[];
  usar(ctx: ContextoEscrita<D>, alvo: Casa): void;
}

/** O efeito acontece ao apertar o botão; depois o jogador ainda faz o lance. */
export interface AcaoImediata<D> extends AcaoBase<D> {
  modo: "imediato";
  usar(ctx: ContextoEscrita<D>): void;
}

/** O poder é um lance especial escolhido no tabuleiro (gasta a vez). */
export interface AcaoDeLance<D> extends AcaoBase<D> {
  modo: "lance";
  /** Lances especiais disponíveis (não chame lancesLegais aqui). */
  lances(ctx: ContextoLeitura<D>): Lance[];
  /** Mexe no tabuleiro e devolve o texto do lance para o histórico. */
  executar(ctx: ContextoEscrita<D>, lance: Lance): string;
}

export type AcaoAtiva<D> = AcaoComAlvo<D> | AcaoImediata<D> | AcaoDeLance<D>;

/** Casa a destacar no tabuleiro (peça protegida, congelada, armadilha...). */
export interface Destaque {
  casa: Casa;
  /** false = só o dono da carta vê (ex.: armadilha). */
  publico: boolean;
  rotulo: string;
  /** "contorno" = só um contorno cinza discreto na casa, sem rótulo (ex.: Peãogonista). */
  estilo?: "contorno";
}

export interface Carta<D extends object = object> {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoCarta;
  /** 1 a 5: quanto a carta ajuda (poder) ou atrapalha (desvantagem). Peso maior sai menos no sorteio. */
  peso: number;
  dadosIniciais?(): D;
  /** Lances extras para `jogador`. Chamado para todas as cartas em jogo, dos dois lados. */
  adicionarLances?(ctx: ContextoLeitura<D>, jogador: Cor): Lance[];
  /**
   * Os lances extras podem capturar/atacar AGORA? false liga os atalhos rápidos do xeque
   * (ex.: Yuumi sem nenhuma carona: subir na carona nunca captura). Sem isto, conta como sim.
   */
  lancesExtrasAtacam?(ctx: ContextoLeitura<D>): boolean;
  /** Remove (ou troca) lances de `jogador`. Roda depois de todos os adicionarLances. */
  filtrarLances?(ctx: ContextoLeitura<D>, lances: Lance[], jogador: Cor): Lance[];
  /** Ordem do filtro: maior roda depois (padrão 0). A partir de ORDEM_FILTRO_FINAL, roda no fim de tudo. */
  ordemFiltro?: number;
  /**
   * Obrigações ("se puder X, tem que fazer X"): roda por último, só sobre lances JÁ
   * legais (com a regra do xeque aplicada), para nunca obrigar um lance proibido.
   * Nunca devolva lista vazia se recebeu lances. Não afeta o cálculo de xeque.
   */
  filtrarLegais?(ctx: ContextoLeitura<D>, lances: Lance[], jogador: Cor): Lance[];
  /** Efeitos depois de qualquer lance (de qualquer jogador). */
  aoMover?(ctx: ContextoEscrita<D>, info: InfoLance): void;
  /** Chamado quando a vez passa para `vez`. */
  inicioDoTurno?(ctx: ContextoEscrita<D>, vez: Cor): void;
  /** true = o dono da carta perde agora. Checado depois de cada lance. */
  condicaoDerrota?(ctx: ContextoLeitura<D>): boolean;
  /** Texto curto de situação mostrado na carta (ex.: "faltam 3 lances"). */
  resumo?(ctx: ContextoLeitura<D>): string | null;
  destaques?(ctx: ContextoLeitura<D>): Destaque[];
  /** Peças que aparecem com outro tipo para quem não vê as cartas do dono (ex.: Ilusão). */
  disfarces?(ctx: ContextoLeitura<D>): { casa: Casa; tipo: TipoPeca }[];
  /** Só faz sentido em partida com relógio: fica fora dos sorteios enquanto não houver. */
  exigeRelogio?: boolean;
  acaoAtiva?: AcaoAtiva<D>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CartaQualquer = Carta<any>;

/** Só ajuda o TypeScript a inferir o tipo dos dados da carta. */
export function definirCarta<D extends object>(carta: Carta<D>): Carta<D> {
  return carta;
}

/**
 * Filtros com esta ordem (ou maior) rodam no fim de tudo: depois do evento do Caos e
 * das casas especiais. Ex.: Capturas obrigatórias só conta as capturas que são permitidas
 * de verdade (na Trégua, ou com a peça no Santuário, não obriga nada).
 */
export const ORDEM_FILTRO_FINAL = 10;
