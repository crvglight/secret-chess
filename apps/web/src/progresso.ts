// Progresso do jogador: conquistas, estatísticas por carta e histórico de partidas.
// Sem login nesta fase: fica tudo no navegador (localStorage).
import {
  aplicarLance,
  contarPecas,
  jogarCartaDaMao,
  obterCarta,
  usarPoder,
  type AcaoPartida,
  type Cor,
  type Estado,
} from "@xadrez/engine";
import type { ModoPartida } from "./modo.ts";

/** O que o jogador fez, na ordem. Basta isso e o estado inicial para rever a partida. */
export type { AcaoPartida } from "@xadrez/engine";

export interface PartidaSalva {
  id: string;
  data: number;
  modo: ModoPartida;
  inicial: Estado;
  acoes: AcaoPartida[];
  /** Com quem foi a partida (apelido do adversário online ou nome da IA). */
  adversario?: string;
  /** Estado final resumido, para a lista do histórico. */
  vencedor: Cor | null;
  motivo: string;
  meioLances: number;
}

export interface Progresso {
  versao: 1;
  /** Conquista → quando foi obtida. */
  conquistas: Record<string, number>;
  /** Carta → partidas em que esteve em jogo e vitórias de quem a tinha. */
  estatisticas: Record<string, { jogos: number; vitorias: number }>;
  partidas: PartidaSalva[];
  /** Adversários marcados como amigos (pelo apelido). */
  amigos?: string[];
}

const CHAVE = "xadrez-progresso";
const MAX_PARTIDAS = 30;

const NOVO: Progresso = { versao: 1, conquistas: {}, estatisticas: {}, partidas: [] };

export function lerProgresso(): Progresso {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<Progresso> | null;
    if (salvo?.versao !== 1) return NOVO;
    // Guarda só o que ainda existe (versões antigas salvavam desbloqueio e cartas criadas).
    return {
      versao: 1,
      conquistas: salvo.conquistas ?? {},
      estatisticas: salvo.estatisticas ?? {},
      partidas: salvo.partidas ?? [],
      amigos: salvo.amigos ?? [],
    };
  } catch {
    return NOVO;
  }
}

export function salvarProgresso(p: Progresso): void {
  // Se o navegador recusar (cheio), larga as partidas mais antigas e tenta de novo.
  for (let partidas = p.partidas; ; partidas = partidas.slice(0, Math.floor(partidas.length / 2))) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ ...p, partidas }));
      return;
    } catch {
      if (partidas.length === 0) return;
    }
  }
}

// ---------------------------------------------------------------------------
// Conquistas
// ---------------------------------------------------------------------------

interface ContextoConquista {
  partida: PartidaSalva;
  final: Estado;
  /** Quem jogou contra a IA (as conquistas valem só nessas partidas). */
  humano: Cor;
  venceu: boolean;
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  checar(c: ContextoConquista): boolean;
}

const nivel = (c: ContextoConquista) => (c.partida.modo.tipo === "ia" ? c.partida.modo.nivel : null);

export const CONQUISTAS: Conquista[] = [
  { id: "primeira-vitoria", nome: "Primeira vitória", descricao: "Vença uma partida (contra a IA ou online).", checar: (c) => c.venceu },
  {
    id: "online",
    nome: "Amigos à mesa",
    descricao: "Vença uma partida online.",
    checar: (c) => c.venceu && c.partida.modo.tipo === "online",
  },
  { id: "vence-medio", nome: "Esquentando", descricao: "Vença a IA no nível médio.", checar: (c) => c.venceu && nivel(c) === "medio" },
  { id: "vence-dificil", nome: "Mestre das cartas", descricao: "Vença a IA no nível difícil.", checar: (c) => c.venceu && nivel(c) === "dificil" },
  {
    id: "vence-stockfish",
    nome: "Contra a máquina",
    descricao: "Vença o Stockfish (qualquer força).",
    checar: (c) => c.venceu && nivel(c) === "stockfish",
  },
  {
    id: "vence-stockfish-8",
    nome: "Lenda",
    descricao: "Vença o Stockfish na força 8.",
    checar: (c) => c.venceu && nivel(c) === "stockfish" && c.partida.modo.tipo === "ia" && c.partida.modo.forca === 8,
  },
  { id: "xeque-mate", nome: "Xeque-mate!", descricao: "Vença por xeque-mate.", checar: (c) => c.venceu && c.final.resultado?.motivo === "xeque-mate" },
  {
    id: "regicida",
    nome: "Golpe de mestre",
    descricao: "Dê xeque-mate com um lance de poder.",
    checar: (c) => {
      const ultimo = c.final.historico.at(-1);
      return c.venceu && c.final.resultado?.motivo === "xeque-mate" && ultimo?.cor === c.humano && !!ultimo.lance.poder;
    },
  },
  {
    id: "peao-regicida",
    nome: "O peão que derrubou o rei",
    descricao: "Dê xeque-mate com um lance de peão.",
    checar: (c) => {
      const ultimo = c.final.historico.at(-1);
      return c.venceu && c.final.resultado?.motivo === "xeque-mate" && ultimo?.cor === c.humano && ultimo.peca === "peao";
    },
  },
  { id: "relampago", nome: "Relâmpago", descricao: "Vença em 15 lances ou menos.", checar: (c) => c.venceu && c.final.lancesFeitos[c.humano] <= 15 },
  { id: "maratona", nome: "Maratona", descricao: "Jogue uma partida de 80 lances ou mais.", checar: (c) => c.final.meioLance >= 160 },
  { id: "draft", nome: "Bom de escolha", descricao: "Vença no modo Draft.", checar: (c) => c.venceu && c.partida.modo.regras === "draft" },
  { id: "mao", nome: "Mão boa", descricao: "Vença no modo Mão de cartas.", checar: (c) => c.venceu && c.partida.modo.regras === "mao" },
  { id: "caos", nome: "Domador do caos", descricao: "Vença no modo Caos.", checar: (c) => c.venceu && c.partida.modo.regras === "caos" },
  {
    id: "casas",
    nome: "Explorador",
    descricao: "Vença uma partida com airdrops.",
    checar: (c) => c.venceu && (!!c.partida.modo.airdrops || !!c.partida.modo.casasEspeciais),
  },
  {
    id: "superacao",
    nome: "Superação",
    descricao: "Vença com uma desvantagem de peso 4 ou mais.",
    checar: (c) => {
      const d = c.final.cartas[c.humano].desvantagem;
      return c.venceu && !!d && obterCarta(d).peso >= 4;
    },
  },
  {
    id: "sem-dama",
    nome: "Quem precisa de dama?",
    descricao: "Vença sem nenhuma dama sua no tabuleiro.",
    checar: (c) => c.venceu && contarPecas(c.final, c.humano, "dama") === 0,
  },
];

// ---------------------------------------------------------------------------
// Fim de partida: estatísticas, conquistas e histórico
// ---------------------------------------------------------------------------

export interface Novidades {
  conquistas: Conquista[];
}

/** Cartas que cada lado teve em jogo (na Mão de cartas, as que jogou). */
function cartasDosLados(final: Estado): Record<Cor, Set<string>> {
  const lados: Record<Cor, Set<string>> = { brancas: new Set(), pretas: new Set() };
  for (const cor of ["brancas", "pretas"] as const) {
    const { poder, desvantagem } = final.cartas[cor];
    if (poder) lados[cor].add(poder);
    if (desvantagem) lados[cor].add(desvantagem);
  }
  for (const e of final.eventos) if (e.texto.startsWith("Jogou a carta")) lados[e.cor].add(e.cartaId);
  return lados;
}

export function registrarFimDePartida(
  modo: ModoPartida,
  inicial: Estado,
  acoes: AcaoPartida[],
  final: Estado,
  /** Com quem foi a partida (apelido do adversário online ou nome da IA). */
  adversario?: string,
): Novidades {
  const p = lerProgresso();
  const r = final.resultado!;

  // Estatísticas: cada carta em jogo conta uma partida, e uma vitória se o dono venceu.
  const estatisticas = { ...p.estatisticas };
  for (const [cor, ids] of Object.entries(cartasDosLados(final)) as [Cor, Set<string>][]) {
    for (const id of ids) {
      const atual = estatisticas[id] ?? { jogos: 0, vitorias: 0 };
      estatisticas[id] = { jogos: atual.jogos + 1, vitorias: atual.vitorias + (r.vencedor === cor ? 1 : 0) };
    }
  }

  const partida: PartidaSalva = {
    id: `${Date.now()}`,
    data: Date.now(),
    modo,
    inicial,
    acoes,
    ...(adversario ? { adversario } : {}),
    vencedor: r.vencedor,
    motivo: r.motivo,
    meioLances: final.meioLance,
  };
  const novo: Progresso = {
    ...p,
    estatisticas,
    partidas: [partida, ...p.partidas].slice(0, MAX_PARTIDAS),
  };

  // Conquistas: contra a IA e online (na partida local, os dois lados são "você").
  const conquistas: Conquista[] = [];
  if (modo.tipo !== "local") {
    const ctx: ContextoConquista = {
      partida,
      final,
      humano: modo.corHumano,
      venceu: r.vencedor === modo.corHumano,
    };
    for (const c of CONQUISTAS) {
      if (!novo.conquistas[c.id] && c.checar(ctx)) {
        novo.conquistas = { ...novo.conquistas, [c.id]: Date.now() };
        conquistas.push(c);
      }
    }
  }

  salvarProgresso(novo);
  return { conquistas };
}

/** Refaz a partida a partir do estado inicial e das ações (para o replay). */
export function reconstruirPartida(partida: Pick<PartidaSalva, "inicial" | "acoes">): Estado[] {
  const estados = [partida.inicial];
  let e = partida.inicial;
  for (const a of partida.acoes) {
    try {
      if (a.tipo === "carta") e = jogarCartaDaMao(e, a.indice);
      else if (a.tipo === "poder") e = usarPoder(e, a.alvo);
      else e = aplicarLance(e, a.lance);
    } catch {
      break; // ação que não vale mais (ex.: regra mudou numa versão nova): para aqui
    }
    estados.push(e);
  }
  return estados;
}

/** Quem venceu, em texto curto, do ponto de vista da lista de partidas. */
export function textoVencedor(p: PartidaSalva): string {
  if (!p.vencedor) return "Empate";
  if (p.modo.tipo !== "local") return p.vencedor === p.modo.corHumano ? "Vitória" : "Derrota";
  return p.vencedor === "brancas" ? "Brancas venceram" : "Pretas venceram";
}


// ---------------------------------------------------------------------------
// Jogadores e amigos
// ---------------------------------------------------------------------------

export interface ResumoJogador {
  nome: string;
  partidas: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  ultima: number;
  amigo: boolean;
}

/** Os adversários online que você já enfrentou, com o placar contra cada um (amigos primeiro). */
export function jogadoresEnfrentados(p: Progresso): ResumoJogador[] {
  const mapa = new Map<string, ResumoJogador>();
  const amigos = new Set(p.amigos ?? []);
  for (const partida of p.partidas) {
    if (partida.modo.tipo !== "online" || !partida.adversario) continue;
    const nome = partida.adversario;
    const r = mapa.get(nome) ?? { nome, partidas: 0, vitorias: 0, derrotas: 0, empates: 0, ultima: 0, amigo: amigos.has(nome) };
    r.partidas++;
    if (!partida.vencedor) r.empates++;
    else if (partida.vencedor === partida.modo.corHumano) r.vitorias++;
    else r.derrotas++;
    r.ultima = Math.max(r.ultima, partida.data);
    mapa.set(nome, r);
  }
  // Amigos que ainda não têm partida salva (ex.: o histórico antigo foi limpo) continuam na lista.
  for (const nome of amigos) {
    if (!mapa.has(nome)) mapa.set(nome, { nome, partidas: 0, vitorias: 0, derrotas: 0, empates: 0, ultima: 0, amigo: true });
  }
  return [...mapa.values()].sort((a, b) => Number(b.amigo) - Number(a.amigo) || b.ultima - a.ultima);
}

/** Marca ou desmarca um adversário como amigo. Devolve o progresso novo. */
export function alternarAmigo(nome: string): Progresso {
  const p = lerProgresso();
  const amigos = new Set(p.amigos ?? []);
  if (amigos.has(nome)) amigos.delete(nome);
  else amigos.add(nome);
  const novo = { ...p, amigos: [...amigos] };
  salvarProgresso(novo);
  return novo;
}
