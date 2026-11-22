import type { ContextoConsulta, ContextoEscrita, ContextoLeitura, CartaQualquer, Destaque } from "./carta.ts";
import { ORDEM_FILTRO_FINAL } from "./carta.ts";
import { obterCarta } from "./cartas/index.ts";
import {
  aplicarCasaEspecial,
  bloqueioDaCasa,
  casasCriamLances,
  DESCRICAO_CASA,
  filtrarPorCasas,
  lancesExtrasDasCasas,
  passoDasCasas,
  sortearCasas,
} from "./casas.ts";
import { avancarCaos, eventoAtivo, iniciarCaos } from "./eventos.ts";
import {
  abrirCaixas,
  airdropsFiltram,
  desvantagemDesligada,
  espiandoPorAirdrop,
  filtrarPorAirdrops,
  iniciarAirdrops,
  passoDosAirdrops,
} from "./airdrops.ts";
import { comprarSeForAHora, encerrarCartaJogada, montarMaos } from "./mao.ts";
import { casaAtacada, gerarLancesBase } from "./movimentos.ts";
import type { Aleatorio } from "./sorteio.ts";
import {
  casaDoNome,
  clonarEstado,
  contarPecas,
  corOposta,
  direcaoPeao,
  FEN_INICIAL,
  LETRA_PECA,
  lerFen,
  nomeCasa,
  pecaCapturada,
} from "./tabuleiro.ts";
import type {
  Casa,
  CartasDoJogador,
  Cor,
  DadosCarta,
  Estado,
  Lance,
  Peca,
  Resultado,
  SlotCarta,
  TipoPeca,
} from "./tipos.ts";
import { CORES } from "./tipos.ts";

const SLOTS: readonly SlotCarta[] = ["poder", "desvantagem"];
const SEM_CARTAS: CartasDoJogador = { poder: null, desvantagem: null };
/** Empate de segurança: 200 lances de cada lado. */
const LIMITE_MEIO_LANCES = 400;

interface CartaEmJogo {
  carta: CartaQualquer;
  dono: Cor;
  slot: SlotCarta;
}

function cartasEmJogo(estado: Estado): CartaEmJogo[] {
  // Modo Caos: o Apagão desliga todas as cartas.
  if (eventoAtivo(estado)?.desligaCartas) return [];
  const lista: CartaEmJogo[] = [];
  for (const dono of CORES) {
    for (const slot of SLOTS) {
      // Airdrop "sem desvantagem": a desvantagem desse lado fica desligada por um tempo.
      if (slot === "desvantagem" && desvantagemDesligada(estado, dono)) continue;
      const id = estado.cartas[dono][slot];
      if (id) lista.push({ carta: obterCarta(id), dono, slot });
    }
  }
  return lista;
}

/** Cartas com filtro, na ordem em que os filtros rodam (`final`: só as do fim, ou só as de antes). */
function cartasComFiltro(cartas: CartaEmJogo[], final = false): CartaEmJogo[] {
  return cartas
    .filter((c) => c.carta.filtrarLances && ((c.carta.ordemFiltro ?? 0) >= ORDEM_FILTRO_FINAL) === final)
    .sort((a, b) => (a.carta.ordemFiltro ?? 0) - (b.carta.ordemFiltro ?? 0));
}

function ctxLeitura(estado: Estado, c: CartaEmJogo): ContextoLeitura<DadosCarta> {
  return { estado, dono: c.dono, dados: estado.dadosCartas[c.dono][c.slot] };
}

function ctxConsulta(estado: Estado, c: CartaEmJogo): ContextoConsulta<DadosCarta> {
  return { ...ctxLeitura(estado, c), lancesLegais: (cor) => lancesLegais(estado, cor) };
}

/**
 * `estado` precisa ser uma cópia nova: a carta vai alterá-lo.
 * `indice` é o meio-lance em que o evento aconteceu (0 = primeiro lance das brancas).
 */
function ctxEscrita(estado: Estado, c: CartaEmJogo, indice = estado.meioLance): ContextoEscrita<DadosCarta> {
  return {
    estado,
    dono: c.dono,
    dados: estado.dadosCartas[c.dono][c.slot],
    lancesLegais: (cor) => lancesLegais(estado, cor),
    registrar: (texto) =>
      estado.eventos.push({ meioLance: indice, cor: c.dono, cartaId: c.carta.id, texto }),
  };
}

function poderDe(estado: Estado, cor: Cor): CartaEmJogo | null {
  const id = estado.cartas[cor].poder;
  return id ? { carta: obterCarta(id), dono: cor, slot: "poder" } : null;
}

export interface OpcoesPartida {
  cartas?: Partial<Record<Cor, Partial<CartasDoJogador>>>;
  /** Posição inicial em FEN (o padrão é a posição normal do xadrez). */
  fen?: string;
  /** Modo Mão de cartas: os poderes vêm da mão (o poder das cartas acima é ignorado). */
  maoDeCartas?: { rng?: Aleatorio; cartas?: readonly CartaQualquer[] };
  /** Modo Caos: eventos globais a cada poucos lances. */
  caos?: { rng?: Aleatorio };
  /** Casas especiais; vale em qualquer modo. `quantos` = quantos tipos sortear (padrão 4). */
  casasEspeciais?: { rng?: Aleatorio; quantos?: number };
  /** Caixas com recompensa que caem durante a partida. */
  airdrops?: { rng?: Aleatorio };
}

export function criarPartida(opcoes: OpcoesPartida = {}): Estado {
  const pos = lerFen(opcoes.fen ?? FEN_INICIAL);
  const cartas = {
    brancas: { ...SEM_CARTAS, ...opcoes.cartas?.brancas },
    pretas: { ...SEM_CARTAS, ...opcoes.cartas?.pretas },
  };
  if (opcoes.maoDeCartas) {
    cartas.brancas.poder = null;
    cartas.pretas.poder = null;
  }

  const dados = (cor: Cor, slot: SlotCarta): DadosCarta => {
    const id = cartas[cor][slot];
    if (!id) return {};
    const carta = obterCarta(id);
    if (carta.tipo !== slot) throw new Error(`A carta ${carta.nome} não é um(a) ${slot}`);
    return { ...carta.dadosIniciais?.() };
  };
  const usos = (cor: Cor): number => {
    const id = cartas[cor].poder;
    return id ? (obterCarta(id).acaoAtiva?.usos ?? 0) : 0;
  };

  const estado: Estado = {
    ...pos,
    meioLance: 0,
    lancesFeitos: { brancas: 0, pretas: 0 },
    cartas,
    dadosCartas: {
      brancas: { poder: dados("brancas", "poder"), desvantagem: dados("brancas", "desvantagem") },
      pretas: { poder: dados("pretas", "poder"), desvantagem: dados("pretas", "desvantagem") },
    },
    usosPoder: { brancas: usos("brancas"), pretas: usos("pretas") },
    poderUsadoNoTurno: false,
    repetirVez: false,
    historico: [],
    eventos: [],
    resultado: null,
    ...(opcoes.maoDeCartas ? { mao: montarMaos(opcoes.maoDeCartas.rng, opcoes.maoDeCartas.cartas) } : {}),
    ...(opcoes.caos ? { caos: iniciarCaos(opcoes.caos.rng) } : {}),
    ...(opcoes.casasEspeciais
      ? {
          casas: {
            ...sortearCasas(opcoes.casasEspeciais.rng, undefined, opcoes.casasEspeciais.quantos),
            presas: [],
            registro: [],
          },
        }
      : {}),
    ...(opcoes.airdrops ? { airdrops: iniciarAirdrops(opcoes.airdrops.rng) } : {}),
  };
  if (lancesLegais(estado).length === 0) estado.resultado = semLances(estado);
  return estado;
}

/** Motivo para o poder de `cor` estar apagado, sem olhar alvos (null = liberado). */
function travaDoPoder(estado: Estado, cor: Cor): string | null {
  const c = poderDe(estado, cor);
  const acao = c?.carta.acaoAtiva;
  if (!c || !acao) return "Seu poder não tem ação para usar";
  if (estado.resultado) return "A partida já terminou";
  if (estado.vez !== cor) return "Espere a sua vez";
  if (estado.usosPoder[cor] <= 0) return "Você já usou todas as vezes";
  if (estado.poderUsadoNoTurno) return "Você já usou o poder nesta rodada";
  if (eventoAtivo(estado)?.desligaCartas) return "O Apagão desligou as cartas";
  return acao.bloqueio?.(ctxConsulta(estado, c)) ?? null;
}

/** Lances especiais do poder (modo "lance"), já marcados com o id da carta. */
function lancesDoPoder(estado: Estado, cor: Cor): Lance[] {
  const c = poderDe(estado, cor);
  const acao = c?.carta.acaoAtiva;
  if (!c || acao?.modo !== "lance" || travaDoPoder(estado, cor)) return [];
  return acao.lances(ctxLeitura(estado, c)).map((l) => ({ ...l, poder: c.carta.id }));
}

/** Lances de `cor` antes dos filtros: os normais, os das cartas e os do poder. */
function lancesSemFiltro(estado: Estado, cor: Cor, cartas: CartaEmJogo[]): Lance[] {
  let lances = gerarLancesBase(estado, cor);
  for (const c of cartas) {
    if (c.carta.adicionarLances) lances = lances.concat(c.carta.adicionarLances(ctxLeitura(estado, c), cor));
  }
  return lances.concat(lancesDoPoder(estado, cor), lancesExtrasDasCasas(estado, cor));
}

/** Lances de `cor` com os efeitos das cartas e do evento, ainda sem a regra do xeque. */
function lancesSemXeque(estado: Estado, cor: Cor): Lance[] {
  if (estado.resultado) return [];
  const cartas = cartasEmJogo(estado);
  let lances = lancesSemFiltro(estado, cor, cartas);
  for (const c of cartasComFiltro(cartas)) lances = c.carta.filtrarLances!(ctxLeitura(estado, c), lances, cor);
  const evento = eventoAtivo(estado);
  if (evento?.filtrarLances) lances = evento.filtrarLances(estado, lances, cor);
  lances = filtrarPorCasas(estado, lances);
  lances = filtrarPorAirdrops(estado, lances);
  for (const c of cartasComFiltro(cartas, true)) lances = c.carta.filtrarLances!(ctxLeitura(estado, c), lances, cor);
  return lances;
}

/** Alguma carta ou casa especial cria lances além dos normais do xadrez? */
function algoCriaLances(estado: Estado, cartas: CartaEmJogo[]): boolean {
  const extrasAtacam = (c: CartaEmJogo) =>
    !!c.carta.adicionarLances && (c.carta.lancesExtrasAtacam?.(ctxLeitura(estado, c)) ?? true);
  return cartas.some((c) => extrasAtacam(c) || (c.carta.ordemFiltro ?? 0) < 0) || casasCriamLances(estado);
}

/** As casas estão na mesma coluna, fileira ou diagonal? */
function alinhadas(a: Casa, b: Casa): boolean {
  const dc = (a % 8) - (b % 8);
  const df = Math.floor(a / 8) - Math.floor(b / 8);
  return dc === 0 || df === 0 || Math.abs(dc) === Math.abs(df);
}

/** O adversário de `cor`, se fosse a vez dele, poderia capturar o rei de `cor`? */
function reiAtacado(estado: Estado, cor: Cor): boolean {
  const adversario = corOposta(cor);
  const t = estado.tabuleiro;
  let casaRei = -1;
  for (let i = 0; i < 64; i++) {
    const p = t[i];
    if (p && p.tipo === "rei" && p.cor === cor) {
      casaRei = i;
      break;
    }
  }
  if (casaRei < 0) return false;

  // Atalhos (a busca da IA chama isto em todo nó):
  // - sem carta que crie lances, as cartas só tiram lances: se nenhuma peça alcança o rei
  //   pelas regras normais, ele não está atacado;
  // - sem nenhuma carta nem evento mexendo nos lances, a conta geométrica já é a resposta.
  const cartas = cartasEmJogo(estado);
  const criaLances = algoCriaLances(estado, cartas);
  const geometrico = casaAtacada(t, casaRei, adversario);
  if (!criaLances && !geometrico) return false;
  const filtra =
    cartas.some((c) => c.carta.filtrarLances) || !!eventoAtivo(estado)?.filtrarLances || !!estado.casas || airdropsFiltram(estado);
  if (!criaLances && !filtra) return geometrico;

  const vista = estado.vez === adversario ? estado : { ...estado, vez: adversario };
  return lancesSemXeque(vista, adversario).some((l) => {
    const alvo = pecaCapturada(vista, l);
    return alvo?.tipo === "rei" && alvo.cor === cor;
  });
}

/** O rei de `cor` está em xeque (o adversário poderia capturá-lo no próximo lance)? */
export function emXeque(estado: Estado, cor: Cor = estado.vez): boolean {
  return !estado.resultado && reiAtacado(estado, cor);
}

/** Casa do rei de quem tem a vez, se ele estiver em xeque (para destacar na tela). */
export function casaDoReiEmXeque(estado: Estado): Casa | null {
  if (!emXeque(estado)) return null;
  return estado.tabuleiro.findIndex((p) => p?.tipo === "rei" && p.cor === estado.vez);
}

/** Depois deste lance, o rei de `cor` continua (ou fica) atacado? Só olha o tabuleiro. */
function deixaReiAtacado(estado: Estado, cor: Cor, lance: Lance): boolean {
  if (pecaCapturada(estado, lance)?.tipo === "rei") return false; // só por efeito estranho de carta
  if (lance.poder) {
    // Lance de poder: a carta mexe no tabuleiro do jeito dela, então simula numa cópia.
    const c = poderDe(estado, cor);
    const acao = c?.carta.acaoAtiva;
    if (!c || acao?.modo !== "lance") return true;
    const depois = clonarEstado(estado);
    acao.executar(ctxEscrita(depois, c, estado.meioLance), lance);
    return reiAtacado(depois, cor);
  }
  // Cópia leve: o teste só precisa do tabuleiro (e do roque, que executar() altera).
  const depois: Estado = {
    ...estado,
    tabuleiro: estado.tabuleiro.slice(),
    roque: { brancas: { ...estado.roque.brancas }, pretas: { ...estado.roque.pretas } },
  };
  executar(depois, lance);
  return reiAtacado(depois, cor);
}

/**
 * Lances legais de `cor`, já com os efeitos de todas as cartas em jogo.
 * Regra do xeque, como no xadrez normal: nenhum lance pode deixar o próprio rei
 * atacado. O roque não sai do xeque, não passa por casa atacada nem cai nela.
 */
export function lancesLegais(estado: Estado, cor: Cor = estado.vez): Lance[] {
  let lances = legaisSemObrigacoes(estado, cor);
  if (lances.length === 0) return lances;
  // Obrigações das cartas (Damas, Kamikaze...): só entre os lances já legais.
  for (const c of cartasEmJogo(estado)) {
    if (c.carta.filtrarLegais) lances = c.carta.filtrarLegais(ctxLeitura(estado, c), lances, cor);
  }
  return lances;
}

/** Lances legais antes das obrigações das cartas. */
function legaisSemObrigacoes(estado: Estado, cor: Cor): Lance[] {
  const lances = lancesSemXeque(estado, cor);
  if (lances.length === 0) return lances;
  const emXequeAgora = reiAtacado(estado, cor);
  // Atalho: fora do xeque e só com lances normais de xadrez, uma peça (que não é o rei)
  // fora da linha do próprio rei não tem como expô-lo ao sair da casa.
  const casaRei = estado.tabuleiro.findIndex((p) => p?.tipo === "rei" && p.cor === cor);
  const atalho = !emXequeAgora && casaRei >= 0 && !algoCriaLances(estado, cartasEmJogo(estado));
  return lances.filter((l) => {
    // O rei nunca é capturado: a partida acaba no xeque-mate. Sem isto, um poder de
    // lance duplo (Cavalo saltador) daria xeque no 1º lance e pegaria o rei no 2º.
    const alvo = pecaCapturada(estado, l);
    if (alvo?.tipo === "rei" && alvo.cor !== cor) return false;
    if (
      atalho &&
      !l.poder &&
      !l.especial?.startsWith("roque") &&
      l.especial !== "en-passant" &&
      l.de !== casaRei &&
      !alinhadas(l.de, casaRei)
    ) {
      return true;
    }
    if (l.especial === "roque-curto" || l.especial === "roque-longo") {
      if (emXequeAgora) return false;
      const passagem = l.especial === "roque-curto" ? l.de + 1 : l.de - 1;
      if (deixaReiAtacado(estado, cor, { de: l.de, para: passagem })) return false;
    }
    return !deixaReiAtacado(estado, cor, l);
  });
}

/** Lances normais (sem os de poder) que saem de `de`. Numa casa com carona, são os da peça de cima. */
export function lancesDaCasa(estado: Estado, de: Casa): Lance[] {
  return lancesLegais(estado).filter((l) => l.de === de && !l.poder);
}

/** Lances da peça de carona que está em cima da peça da casa `de` (poder Yuumi). */
export function lancesDaCarona(estado: Estado, de: Casa): Lance[] {
  return lancesLegais(estado).filter((l) => l.de === de && l.montada === "descer");
}

export interface Bloqueio {
  /** Id da carta, ou do evento global quando `evento` é true. */
  cartaId: string;
  nome: string;
  dono: Cor;
  /** true = quem bloqueia é um evento do modo Caos (vale para os dois lados). */
  evento?: boolean;
  /** true = o lance não tira o rei do xeque. */
  xeque?: boolean;
  /** true = quem impede é uma casa especial (lama ou muralha). */
  casa?: boolean;
}

/**
 * Se o lance de `de` para `para` só é proibido por causa de uma carta, diz qual.
 * Serve para o aviso "sua desvantagem bloqueia este lance".
 */
export function motivoBloqueio(estado: Estado, de: Casa, para: Casa): Bloqueio | null {
  if (estado.resultado) return null;
  const cor = estado.vez;
  const cartas = cartasEmJogo(estado);
  const existe = (lista: Lance[]) => lista.some((l) => l.de === de && l.para === para && !l.poder);
  let lances = lancesSemFiltro(estado, cor, cartas);
  for (const c of cartasComFiltro(cartas)) {
    const antes = existe(lances);
    lances = c.carta.filtrarLances!(ctxLeitura(estado, c), lances, cor);
    if (antes && !existe(lances)) return { cartaId: c.carta.id, nome: c.carta.nome, dono: c.dono };
  }
  const evento = eventoAtivo(estado);
  if (evento?.filtrarLances && existe(lances) && !existe(evento.filtrarLances(estado, lances, cor))) {
    return { cartaId: evento.id, nome: evento.nome, dono: cor, evento: true };
  }
  if (evento?.filtrarLances) lances = evento.filtrarLances(estado, lances, cor);
  const daCasa = lances.find((l) => l.de === de && l.para === para && !l.poder);
  const tipoCasa = daCasa ? bloqueioDaCasa(estado, daCasa) : null;
  if (tipoCasa) return { cartaId: tipoCasa, nome: DESCRICAO_CASA[tipoCasa].nome, dono: cor, casa: true };
  lances = filtrarPorCasas(estado, lances);
  for (const c of cartasComFiltro(cartas, true)) {
    const antes = existe(lances);
    lances = c.carta.filtrarLances!(ctxLeitura(estado, c), lances, cor);
    if (antes && !existe(lances)) return { cartaId: c.carta.id, nome: c.carta.nome, dono: c.dono };
  }
  let legais = legaisSemObrigacoes(estado, cor);
  if (existe(lances) && !existe(legais)) {
    return { cartaId: "xeque", nome: "Xeque", dono: cor, xeque: true };
  }
  for (const c of cartasEmJogo(estado)) {
    if (!c.carta.filtrarLegais) continue;
    const antes = existe(legais);
    legais = c.carta.filtrarLegais(ctxLeitura(estado, c), legais, cor);
    if (antes && !existe(legais)) return { cartaId: c.carta.id, nome: c.carta.nome, dono: c.dono };
  }
  return null;
}

function mesmoLance(a: Lance, b: Lance): boolean {
  return (
    a.de === b.de &&
    a.para === b.para &&
    (a.promocao ?? null) === (b.promocao ?? null) &&
    (a.poder ?? null) === (b.poder ?? null) &&
    (a.montada ?? null) === (b.montada ?? null)
  );
}

function textoLance(lance: Lance, peca: Peca, captura: Peca | null): string {
  if (lance.especial === "roque-curto") return "O-O";
  if (lance.especial === "roque-longo") return "O-O-O";
  const promocao = lance.promocao ? `=${LETRA_PECA[lance.promocao]}` : "";
  if (lance.montada === "montar") return `${LETRA_PECA[peca.tipo] || "P"}${nomeCasa(lance.de)}⤴${nomeCasa(lance.para)} (carona)`;
  const texto = `${LETRA_PECA[peca.tipo]}${nomeCasa(lance.de)}${captura ? "x" : "-"}${nomeCasa(lance.para)}${promocao}`;
  return lance.montada === "descer" ? `${texto} (desceu da carona)` : texto;
}

/** Move as peças no tabuleiro (que já é uma cópia) e atualiza roque, en passant e contadores. */
function executar(e: Estado, lance: Lance): { peca: Peca; captura: Peca | null } {
  const t = e.tabuleiro;
  // Carona (Yuumi). As caronas são trocadas por um objeto novo (nunca alteradas no lugar),
  // porque a simulação do xeque usa uma cópia leve do estado.
  if (lance.montada === "montar") {
    const peca = t[lance.de]!;
    const base = t[lance.para]!;
    e.montadas = { ...e.montadas, [base.id]: peca };
    t[lance.de] = null;
    e.enPassant = null;
    e.semProgresso++;
    return { peca, captura: null };
  }
  let peca = t[lance.de]!;
  if (lance.montada === "descer") {
    // A peça de cima sai sozinha; a de baixo continua na casa.
    const base = peca;
    peca = e.montadas![base.id]!;
    e.montadas = semCarona(e.montadas!, base.id);
    const captura = t[lance.para] ?? null;
    if (captura && e.montadas[captura.id]) e.montadas = semCarona(e.montadas, captura.id);
    t[lance.para] = lance.promocao ? { ...peca, tipo: lance.promocao } : peca;
    atualizarRoque(e, [lance.para]);
    e.enPassant = lance.especial === "duplo" && !lance.promocao ? (lance.de + lance.para) / 2 : null;
    e.semProgresso = peca.tipo === "peao" || captura ? 0 : e.semProgresso + 1;
    return { peca, captura };
  }
  let captura = t[lance.para] ?? null;
  // Capturar a peça de baixo de uma carona leva as duas.
  if (captura && e.montadas?.[captura.id]) e.montadas = semCarona(e.montadas, captura.id);

  if (lance.especial === "en-passant") {
    const casaCapturada = lance.para - 8 * direcaoPeao(peca.cor);
    captura = t[casaCapturada] ?? null;
    t[casaCapturada] = null;
  }
  t[lance.para] = lance.promocao ? { ...peca, tipo: lance.promocao } : peca;
  t[lance.de] = null;

  if (lance.especial === "roque-curto") {
    t[lance.de + 1] = t[lance.de + 3]!;
    t[lance.de + 3] = null;
  } else if (lance.especial === "roque-longo") {
    t[lance.de - 1] = t[lance.de - 4]!;
    t[lance.de - 4] = null;
  }

  if (peca.tipo === "rei") e.roque[peca.cor] = { curto: false, longo: false };
  atualizarRoque(e, [lance.de, lance.para]);

  e.enPassant = lance.especial === "duplo" && !lance.promocao ? (lance.de + lance.para) / 2 : null;
  e.semProgresso = peca.tipo === "peao" || captura ? 0 : e.semProgresso + 1;
  return { peca, captura };
}

function semCarona(montadas: Record<number, Peca>, id: number): Record<number, Peca> {
  const resto = { ...montadas };
  delete resto[id];
  return resto;
}

/** Tira as caronas cuja peça de baixo saiu do tabuleiro (capturada por carta, bomba...). */
function limparCaronas(e: Estado): void {
  if (!e.montadas) return;
  const noTabuleiro = new Set(e.tabuleiro.filter((p) => p).map((p) => p!.id));
  for (const id of Object.keys(e.montadas)) {
    if (!noTabuleiro.has(Number(id))) e.montadas = semCarona(e.montadas, Number(id));
  }
}

/** Uma torre que sai do canto (ou é capturada lá) tira aquele roque. */
function atualizarRoque(e: Estado, casas: Casa[]): void {
  for (const c of casas) {
    if (c === 0) e.roque.brancas.longo = false;
    if (c === 7) e.roque.brancas.curto = false;
    if (c === 56) e.roque.pretas.longo = false;
    if (c === 63) e.roque.pretas.curto = false;
  }
}

/**
 * Faz o lance e devolve um estado novo (o antigo não muda).
 * Se `promocao` faltar num lance de promoção, promove a dama.
 */
export function aplicarLance(estado: Estado, lance: Lance): Estado {
  if (estado.resultado) throw new Error("A partida já terminou");
  const legais = lancesLegais(estado);
  const legal =
    legais.find((l) => mesmoLance(l, lance)) ??
    (lance.promocao ? undefined : legais.find((l) => mesmoLance(l, { ...lance, promocao: "dama" })));
  if (!legal) throw new Error(`Lance ilegal: ${nomeCasa(lance.de)}-${nomeCasa(lance.para)}`);
  return aplicarLanceGerado(estado, legal);
}

/**
 * Como aplicarLance, mas sem conferir se o lance é legal: use só com lances
 * que vieram de lancesLegais(estado). É o caminho rápido da IA.
 */
export function aplicarLanceGerado(estado: Estado, legal: Lance): Estado {
  const cor = estado.vez;
  const novo = clonarEstado(estado);
  let peca: Peca;
  let captura: Peca | null;
  let texto: string;

  if (legal.poder) {
    // Lance de poder: a carta mexe no tabuleiro do jeito dela.
    const c = poderDe(estado, cor)!;
    const acao = c.carta.acaoAtiva;
    if (acao?.modo !== "lance") throw new Error("Lance de poder inválido");
    peca = estado.tabuleiro[legal.de]!;
    captura = null;
    texto = acao.executar(ctxEscrita(novo, c, estado.meioLance), legal);
    atualizarRoque(novo, [legal.de, legal.para]);
    novo.enPassant = null;
    novo.semProgresso++;
    novo.usosPoder[cor]--;
    novo.poderUsadoNoTurno = true;
  } else {
    ({ peca, captura } = executar(novo, legal));
    texto = textoLance(legal, peca, captura);
  }

  novo.meioLance++;
  novo.lancesFeitos[cor]++;
  comprarSeForAHora(novo, cor);
  novo.historico.push({ cor, lance: legal, peca: peca.tipo, captura: captura?.tipo ?? null, texto });

  if (captura?.tipo === "rei") {
    novo.resultado = { vencedor: cor, motivo: "rei-capturado" };
    return novo;
  }

  // Casas especiais: portal, lama ou baú onde a peça parou.
  aplicarCasaEspecial(novo, legal, cor, estado.meioLance);

  const cartas = cartasEmJogo(novo);
  for (const c of cartas) {
    c.carta.aoMover?.(ctxEscrita(novo, c, estado.meioLance), { jogador: cor, lance: legal, peca, captura, antes: estado });
  }

  limparCaronas(novo);
  // Airdrops: abre a caixa onde uma peça parou.
  abrirCaixas(novo, estado.meioLance);

  // Uma carta pode ter tirado um rei do tabuleiro.
  const semRei = CORES.filter((c) => contarPecas(novo, c, "rei") === 0);
  if (semRei.length > 0) {
    // Uma carta pode já ter dito o resultado (ex.: o rei explodiu no C4).
    novo.resultado ??=
      semRei.length === 2 ? { vencedor: null, motivo: "rei-capturado" } : { vencedor: corOposta(semRei[0]!), motivo: "rei-capturado" };
    return novo;
  }

  const perdedores = cartas.filter((c) => c.carta.condicaoDerrota?.(ctxLeitura(novo, c)));
  if (perdedores.length > 0) {
    const p = perdedores[0]!;
    for (const c of perdedores) ctxEscrita(novo, c, estado.meioLance).registrar(`${c.carta.nome} causou a derrota`);
    novo.resultado = perdedores.some((c) => c.dono !== p.dono)
      ? { vencedor: null, motivo: "carta" }
      : { vencedor: corOposta(p.dono), motivo: "carta", cartaId: p.carta.id };
    return novo;
  }

  if (novo.repetirVez) {
    novo.repetirVez = false;
  } else {
    novo.vez = corOposta(cor);
    novo.poderUsadoNoTurno = false;
    for (const c of cartas) c.carta.inicioDoTurno?.(ctxEscrita(novo, c), novo.vez);
    // Mão de cartas: a carta que este lado jogou na rodada passada sai de jogo.
    encerrarCartaJogada(novo, novo.vez);
  }
  // Modo Caos: talvez seja hora de um evento global.
  avancarCaos(novo);
  // Casas especiais: vulcão, esteira e areia movediça.
  passoDasCasas(novo);
  // Airdrops: efeitos que vencem e caixa nova na hora certa.
  passoDosAirdrops(novo);

  if (novo.semProgresso >= 100) {
    novo.resultado = { vencedor: null, motivo: "50-lances" };
  } else if (novo.meioLance >= LIMITE_MEIO_LANCES) {
    novo.resultado = { vencedor: null, motivo: "limite" };
  } else if (lancesLegais(novo).length === 0) {
    novo.resultado = semLances(novo);
  }
  return novo;
}

/** Quem tem a vez ficou sem lance: em xeque é xeque-mate; fora do xeque é afogamento (empate). */
function semLances(estado: Estado): Resultado {
  return reiAtacado(estado, estado.vez)
    ? { vencedor: corOposta(estado.vez), motivo: "xeque-mate" }
    : { vencedor: null, motivo: "afogamento" };
}

/** Atalho com nomes de casas: jogar(estado, "e2", "e4"). */
export function jogar(estado: Estado, de: string, para: string, promocao?: TipoPeca): Estado {
  const lance: Lance = { de: casaDoNome(de), para: casaDoNome(para) };
  if (promocao) lance.promocao = promocao;
  return aplicarLance(estado, lance);
}

/** Atalho para lances de poder (teleporte, troca): jogarPoder(estado, "b1", "d3"). */
export function jogarPoder(estado: Estado, de: string, para: string): Estado {
  const id = estado.cartas[estado.vez].poder;
  if (!id) throw new Error("Sem poder");
  return aplicarLance(estado, { de: casaDoNome(de), para: casaDoNome(para), poder: id });
}

export interface InfoPoder {
  cartaId: string | null;
  modo: "alvo" | "imediato" | "lance" | null;
  usosRestantes: number;
  disponivel: boolean;
  /** Por que o poder está apagado (quando não está disponível). */
  motivo: string | null;
  precisaAlvo: boolean;
  instrucao: string | null;
  /** Modo alvo: casas que podem ser escolhidas. Modo lance: peças que podem fazer o lance especial. */
  alvos: Casa[];
}

export function infoPoder(estado: Estado, cor: Cor = estado.vez): InfoPoder {
  const c = poderDe(estado, cor);
  const acao = c?.carta.acaoAtiva;
  const info: InfoPoder = {
    cartaId: c?.carta.id ?? null,
    modo: acao?.modo ?? null,
    usosRestantes: estado.usosPoder[cor],
    disponivel: false,
    motivo: null,
    precisaAlvo: acao?.modo === "alvo",
    instrucao: acao?.instrucao ?? null,
    alvos: [],
  };
  const trava = travaDoPoder(estado, cor);
  if (trava || !c || !acao) return { ...info, motivo: trava };

  let alvos: Casa[] = [];
  if (acao.modo === "alvo") {
    alvos = acao.alvosValidos(ctxConsulta(estado, c)).filter((a) => !poderSemSaida(estado, c, a));
  }
  if (acao.modo === "imediato" && poderSemSaida(estado, c, null)) {
    return { ...info, motivo: "Usar agora deixaria o seu rei sem saída" };
  }
  if (acao.modo === "lance") {
    alvos = [...new Set(lancesLegais(estado, cor).filter((l) => l.poder).map((l) => l.de))];
  }
  if (acao.modo !== "imediato" && alvos.length === 0) return { ...info, motivo: "Não há onde usar o poder agora" };
  return { ...info, disponivel: true, alvos };
}

/**
 * O poder (alvo ou imediato) não gasta o lance, mas depois dele ainda é preciso
 * jogar sem deixar o rei atacado. Se não sobrar nenhum lance assim, o poder não vale.
 */
function poderSemSaida(estado: Estado, c: CartaEmJogo, alvo: Casa | null): boolean {
  const acao = c.carta.acaoAtiva;
  if (acao?.modo !== "alvo" && acao?.modo !== "imediato") return false;
  const depois = clonarEstado(estado);
  if (acao.modo === "alvo") acao.usar(ctxEscrita(depois, c), alvo!);
  else acao.usar(ctxEscrita(depois, c));
  depois.usosPoder[c.dono]--;
  depois.poderUsadoNoTurno = true;
  return lancesLegais(depois, c.dono).length === 0;
}

/** Lances especiais do poder (modo "lance") que saem de `de`. */
export function lancesDePoderDaCasa(estado: Estado, de: Casa): Lance[] {
  return lancesLegais(estado).filter((l) => l.de === de && l.poder);
}

/** Alvos que a IA deve testar, se a carta disser; null = a IA decide sozinha. */
export function alvosSugeridosParaIA(estado: Estado, cor: Cor): Casa[] | null {
  const c = poderDe(estado, cor);
  const acao = c?.carta.acaoAtiva;
  if (!c || acao?.modo !== "alvo" || !acao.alvosParaIA) return null;
  return acao.alvosParaIA(ctxConsulta(estado, c));
}

/**
 * Usa o poder do jogador da vez (modos "alvo" e "imediato").
 * Não gasta o lance: depois disso ele ainda joga.
 */
export function usarPoder(estado: Estado, alvo: Casa | null = null): Estado {
  const cor = estado.vez;
  const info = infoPoder(estado, cor);
  if (!info.disponivel) throw new Error(info.motivo ?? "Poder indisponível");
  const c = poderDe(estado, cor)!;
  const acao = c.carta.acaoAtiva!;
  if (acao.modo === "lance") throw new Error("Este poder é um lance: escolha no tabuleiro");

  const novo = clonarEstado(estado);
  if (acao.modo === "alvo") {
    if (alvo === null || !info.alvos.includes(alvo)) throw new Error("Alvo inválido para o poder");
    acao.usar(ctxEscrita(novo, c), alvo);
  } else {
    acao.usar(ctxEscrita(novo, c));
  }
  novo.usosPoder[cor]--;
  novo.poderUsadoNoTurno = true;
  return novo;
}

/** Texto de situação da carta (ex.: "faltam 3 lances"), se ela tiver. */
export function resumoDaCarta(estado: Estado, cor: Cor, slot: SlotCarta): string | null {
  const id = estado.cartas[cor][slot];
  if (!id) return null;
  const c: CartaEmJogo = { carta: obterCarta(id), dono: cor, slot };
  return c.carta.resumo?.(ctxLeitura(estado, c)) ?? null;
}

export interface DestaqueNoTabuleiro extends Destaque {
  dono: Cor;
  cartaId: string;
}

/** As cartas de `cor` ficam abertas para o adversário (desvantagem Espião)? */
export function cartasAbertas(estado: Estado, cor: Cor): boolean {
  // Desvantagem Espião, ou o adversário abriu um airdrop "espiar".
  return estado.cartas[cor].desvantagem === "espiao" || espiandoPorAirdrop(estado, corOposta(cor));
}

export interface Disfarce {
  casa: Casa;
  tipo: TipoPeca;
  dono: Cor;
}

/** Peças disfarçadas (ex.: Ilusão). Mostre o disfarce só para quem não vê as cartas do dono. */
export function disfarcesDasCartas(estado: Estado): Disfarce[] {
  return cartasEmJogo(estado).flatMap((c) =>
    (c.carta.disfarces?.(ctxLeitura(estado, c)) ?? []).map((d) => ({ ...d, dono: c.dono })),
  );
}

/** Casas que as cartas mandam destacar. Filtre `publico` para esconder os segredos. */
export function destaquesDasCartas(estado: Estado): DestaqueNoTabuleiro[] {
  return cartasEmJogo(estado).flatMap((c) =>
    (c.carta.destaques?.(ctxLeitura(estado, c)) ?? []).map((d) => ({ ...d, dono: c.dono, cartaId: c.carta.id })),
  );
}
