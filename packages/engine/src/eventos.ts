// Modo Caos: a cada LANCES_ENTRE_EVENTOS meios-lances, um evento global muda a
// partida para os dois lados. A sequência de eventos é sorteada no início (e é
// pública: a tela mostra o próximo evento, então ninguém é pego de surpresa).
import { obterCarta } from "./cartas/index.ts";
import type { Aleatorio } from "./sorteio.ts";
import {
  casasDasPecas,
  coluna,
  direcaoPeao,
  distancia,
  fileira,
  pecaCapturada,
  ultimaFileira,
} from "./tabuleiro.ts";
import type { Cor, Estado, EstadoCaos, Lance } from "./tipos.ts";
import { CORES } from "./tipos.ts";

/** Meios-lances entre um evento e o próximo (4 lances de cada lado). */
export const LANCES_ENTRE_EVENTOS = 8;
const TAMANHO_SEQUENCIA = 60;

export interface EventoGlobal {
  id: string;
  nome: string;
  descricao: string;
  /** Quantos meios-lances dura (0 = acontece na hora e acaba). Nunca passa do próximo evento. */
  duracao: number;
  aoComecar?(estado: Estado): void;
  aoTerminar?(estado: Estado): void;
  filtrarLances?(estado: Estado, lances: Lance[], jogador: Cor): Lance[];
  /** Enquanto ativo, nenhuma carta (poder ou desvantagem) funciona. */
  desligaCartas?: boolean;
}

/** Os dois lados trocam o poder (com os usos que restam; os dados da carta recomeçam). */
function trocarPoderes(estado: Estado): void {
  const { brancas, pretas } = estado.cartas;
  estado.cartas = {
    brancas: { ...brancas, poder: pretas.poder },
    pretas: { ...pretas, poder: brancas.poder },
  };
  estado.usosPoder = { brancas: estado.usosPoder.pretas, pretas: estado.usosPoder.brancas };
  const dadosNovos = (cor: Cor) => {
    const id = estado.cartas[cor].poder;
    return id ? { ...obterCarta(id).dadosIniciais?.() } : {};
  };
  estado.dadosCartas = {
    brancas: { ...estado.dadosCartas.brancas, poder: dadosNovos("brancas") },
    pretas: { ...estado.dadosCartas.pretas, poder: dadosNovos("pretas") },
  };
}

export const EVENTOS: readonly EventoGlobal[] = [
  {
    id: "terremoto",
    nome: "Terremoto",
    descricao: "Todos os peões andam 1 casa para a frente, se a casa estiver livre.",
    duracao: 0,
    aoComecar(estado) {
      const t = estado.tabuleiro;
      for (const cor of CORES) {
        // Os mais avançados primeiro, para um peão não bloquear o de trás à toa.
        const peoes = casasDasPecas(estado, cor, "peao").sort(
          (a, b) => (fileira(b) - fileira(a)) * direcaoPeao(cor),
        );
        for (const de of peoes) {
          const para = de + 8 * direcaoPeao(cor);
          if (para < 0 || para > 63 || t[para] || fileira(para) === ultimaFileira(cor)) continue;
          t[para] = t[de]!;
          t[de] = null;
        }
      }
      estado.enPassant = null;
    },
  },
  {
    id: "espelho",
    nome: "Espelho",
    descricao: "Os dois lados trocam de poder até o próximo evento.",
    duracao: LANCES_ENTRE_EVENTOS,
    aoComecar: trocarPoderes,
    aoTerminar: trocarPoderes,
  },
  {
    id: "tregua",
    nome: "Trégua",
    descricao: "Ninguém pode capturar por 2 rodadas.",
    duracao: 4,
    filtrarLances: (estado, lances) => lances.filter((l) => !pecaCapturada(estado, l)),
  },
  {
    id: "tempestade",
    nome: "Tempestade",
    descricao: "Bispos, torres e damas andam no máximo 2 casas por 3 rodadas.",
    duracao: 6,
    filtrarLances: (estado, lances) =>
      lances.filter((l) => {
        const tipo = estado.tabuleiro[l.de]?.tipo;
        const longe = tipo === "bispo" || tipo === "torre" || tipo === "dama";
        return l.poder || !longe || distancia(l.de, l.para) <= 2;
      }),
  },
  {
    id: "revolucao",
    nome: "Revolução",
    descricao: "O peão mais avançado de cada lado vira dama.",
    duracao: 0,
    aoComecar(estado) {
      for (const cor of CORES) {
        const avanco = (c: number) => (cor === "brancas" ? fileira(c) : 7 - fileira(c));
        const peoes = casasDasPecas(estado, cor, "peao");
        if (peoes.length === 0) continue;
        // Empate no avanço: o mais perto do centro.
        const melhor = peoes.reduce((m, c) =>
          avanco(c) > avanco(m) || (avanco(c) === avanco(m) && Math.abs(coluna(c) - 3.5) < Math.abs(coluna(m) - 3.5))
            ? c
            : m,
        );
        estado.tabuleiro[melhor] = { ...estado.tabuleiro[melhor]!, tipo: "dama" };
      }
    },
  },
  {
    id: "apagao",
    nome: "Apagão",
    descricao: "Todas as cartas (poderes e desvantagens) ficam desligadas por 3 rodadas.",
    duracao: 6,
    desligaCartas: true,
  },
];

const PORID = new Map(EVENTOS.map((e) => [e.id, e]));

export function obterEvento(id: string): EventoGlobal {
  const e = PORID.get(id);
  if (!e) throw new Error(`Evento desconhecido: ${id}`);
  return e;
}

/** Sorteia a sequência de eventos da partida (sem repetir o mesmo evento seguido). */
export function iniciarCaos(rng: Aleatorio = Math.random): EstadoCaos {
  const sequencia: string[] = [];
  while (sequencia.length < TAMANHO_SEQUENCIA) {
    const id = EVENTOS[Math.floor(rng() * EVENTOS.length)]!.id;
    if (id !== sequencia.at(-1)) sequencia.push(id);
  }
  return { sequencia, indice: 0, ativo: null, registro: [] };
}

/** O evento em vigor agora, se houver. */
export function eventoAtivo(estado: Estado): EventoGlobal | null {
  return estado.caos?.ativo ? obterEvento(estado.caos.ativo.id) : null;
}

/** O próximo evento e em quantos meios-lances ele começa. */
export function proximoEvento(estado: Estado): { evento: EventoGlobal; emMeiosLances: number } | null {
  const caos = estado.caos;
  if (!caos || caos.indice >= caos.sequencia.length) return null;
  return {
    evento: obterEvento(caos.sequencia[caos.indice]!),
    emMeiosLances: LANCES_ENTRE_EVENTOS - (estado.meioLance % LANCES_ENTRE_EVENTOS),
  };
}

/** Meios-lances que faltam para o evento ativo acabar. */
export function restanteDoEvento(estado: Estado): number {
  return estado.caos?.ativo ? Math.max(0, estado.caos.ativo.ate - estado.meioLance) : 0;
}

/**
 * Chamado pelo motor depois de cada lance (o estado já é uma cópia):
 * encerra o evento que venceu e, na hora certa, começa o próximo.
 */
export function avancarCaos(estado: Estado): void {
  const caos = estado.caos;
  if (!caos) return;
  const hora = estado.meioLance > 0 && estado.meioLance % LANCES_ENTRE_EVENTOS === 0;

  if (caos.ativo && (estado.meioLance >= caos.ativo.ate || hora)) {
    obterEvento(caos.ativo.id).aoTerminar?.(estado);
    caos.ativo = null;
  }
  if (!hora || caos.indice >= caos.sequencia.length) return;

  const evento = obterEvento(caos.sequencia[caos.indice]!);
  caos.indice++;
  caos.registro.push({ meioLance: estado.meioLance, id: evento.id });
  evento.aoComecar?.(estado);
  if (evento.duracao > 0) caos.ativo = { id: evento.id, ate: estado.meioLance + evento.duracao };
}
