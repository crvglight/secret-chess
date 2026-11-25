import { definirCarta } from "../carta.ts";
import type { Casa, Cor, Estado } from "../tipos.ts";

interface Dados {
  semente: number;
}

/** A cada quantos lances seus a internet cai. */
const CICLO = 5;
const CASAS_SEM_SINAL = 3;

function sorte(semente: number, n: number, i: number): number {
  let h = Math.imul(semente ^ (n * 31 + i + 0x9e3779b9), 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Neste lance de `dono`, a internet caiu? */
const lanceSemSinal = (estado: Estado, dono: Cor) => (estado.lancesFeitos[dono] + 1) % CICLO === 0;

/** As 3 casas vazias que "não carregaram" neste lance (sempre as mesmas para o mesmo lance). */
function casasSemSinal(estado: Estado, dono: Cor, semente: number): Casa[] {
  const vazias = estado.tabuleiro.map((p, c) => (p ? -1 : c)).filter((c) => c >= 0);
  const escolhidas: Casa[] = [];
  for (let i = 0; escolhidas.length < CASAS_SEM_SINAL && vazias.length > 0; i++) {
    escolhidas.push(vazias.splice(Math.floor(sorte(semente, estado.lancesFeitos[dono], i) * vazias.length), 1)[0]!);
  }
  return escolhidas;
}

/** Voanet: a cada 5 lances seus, 3 casas vazias ao acaso ficam bloqueadas para as suas peças naquele lance. */
export default definirCarta<Dados>({
  id: "voanet",
  nome: "Voanet",
  tipo: "desvantagem",
  peso: 2,
  descricao: "A cada 5 lances seus, três casas vazias ao acaso “não carregam”: suas peças não podem ir para elas naquele lance.",
  dadosIniciais: () => ({ semente: Math.floor(Math.random() * 2 ** 31) }),

  // Só entre os lances legais: nunca deixa você sem lance.
  filtrarLegais({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || estado.vez !== dono || !lanceSemSinal(estado, dono)) return lances;
    const bloqueadas = new Set(casasSemSinal(estado, dono, dados.semente));
    const restantes = lances.filter((l) => !bloqueadas.has(l.para));
    return restantes.length > 0 ? restantes : lances;
  },

  destaques: ({ estado, dono, dados }) =>
    estado.vez === dono && lanceSemSinal(estado, dono) && !estado.resultado
      ? casasSemSinal(estado, dono, dados.semente).map((casa) => ({ casa, publico: true, rotulo: "Sem sinal" }))
      : [],

  resumo: ({ estado, dono }) => {
    const falta = CICLO - ((estado.lancesFeitos[dono] + 1) % CICLO || CICLO);
    return falta === 0 ? "sem sinal neste lance!" : `sinal cai daqui a ${falta + 1} lance(s)`;
  },
});
