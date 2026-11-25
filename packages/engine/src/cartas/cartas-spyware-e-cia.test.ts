import { describe, expect, it } from "vitest";
import {
  aleatorioComSemente,
  criarPartida,
  jogar,
  lancesLegais,
  nomeCasa,
  sortearCartas,
  type Estado,
  lanceDeMultitasking,
  passarVez,
  travaDePassar,
  type OpcoesPartida,
} from "../index.ts";
import { casasSemSinal } from "./voanet.ts";

const brancas = (poder: string | null, desvantagem: string | null = null): OpcoesPartida["cartas"] => ({
  brancas: { poder, desvantagem },
});
const lances = (e: Estado) => lancesLegais(e).map((l) => nomeCasa(l.de) + nomeCasa(l.para));

describe("Spyware e Wallhack", () => {
  it("Spyware: o adversário começa com uma desvantagem extra", () => {
    const e = criarPartida({ cartas: { brancas: { poder: "spyware", desvantagem: null }, pretas: { poder: null, desvantagem: "sem-roque" } }, rng: aleatorioComSemente(4) });
    expect(e.cartas.pretas.extra).toBeTruthy();
    expect(e.cartas.pretas.extra).not.toBe("sem-roque");
    expect(e.dadosCartas.pretas.extra).toBeDefined();
  });

  it("a desvantagem extra vale de verdade (ex.: Sem roque como extra)", () => {
    const base = criarPartida({ fen: "4k3/8/8/8/8/8/8/R3K2R b KQ - 0 1", cartas: { pretas: { poder: "spyware", desvantagem: null } } });
    const e: Estado = { ...base, vez: "brancas", cartas: { ...base.cartas, brancas: { ...base.cartas.brancas, extra: "sem-roque" } }, dadosCartas: { ...base.dadosCartas, brancas: { ...base.dadosCartas.brancas, extra: {} } } };
    expect(lances(e)).not.toContain("e1g1");
  });

  it("Wallhack só entra nos sorteios online", () => {
    const rng = aleatorioComSemente(9);
    let local = 0;
    let online = 0;
    for (let i = 0; i < 4000; i++) {
      if (Object.values(sortearCartas(rng)).some((x) => x.poder === "wallhack")) local++;
      if (Object.values(sortearCartas(rng, undefined, false, true)).some((x) => x.poder === "wallhack")) online++;
    }
    expect(local).toBe(0);
    expect(online).toBeGreaterThan(0);
  });
});

describe("Covarde, Esquerdista e Carta na Manga", () => {
  it("Covarde: em xeque, tem que mover o rei (se ele puder)", () => {
    // Torre preta dá xeque em e1; o bispo branco poderia bloquear em e2, mas o rei tem que andar.
    const e = criarPartida({ fen: "4r1k1/8/8/8/8/8/8/3BK3 w - - 0 1", cartas: brancas(null, "covarde") });
    expect(lancesLegais(e).every((l) => nomeCasa(l.de) === "e1")).toBe(true);
  });

  it("Esquerdista: o bispo branco só captura para a esquerda", () => {
    const e = criarPartida({ fen: "4k3/8/8/1p3p2/8/3B4/8/4K3 w - - 0 1", cartas: brancas(null, "esquerdista") });
    expect(lances(e)).toContain("d3b5");
    expect(lances(e)).not.toContain("d3f5");
  });

  it("Carta na Manga: o peão captura para trás na diagonal", () => {
    const e = criarPartida({ fen: "4k3/8/8/4P3/3n4/8/8/4K3 w - - 0 1", cartas: brancas("carta-na-manga") });
    expect(lances(e)).toContain("e5d4");
  });
});

describe("Torres Gêmeas, Power Spike e Odds", () => {
  it("Torres Gêmeas: perder uma torre leva a outra", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/r7/R3K2R b - - 0 1", cartas: brancas(null, "torres-gemeas") });
    const d = jogar(e, "a2", "a1");
    expect(d.tabuleiro.filter((p) => p?.tipo === "torre" && p.cor === "brancas")).toHaveLength(0);
  });

  it("Power Spike: no 25º lance, 2 peões viram cavalo, bispo ou torre", () => {
    const e0 = criarPartida({ fen: "4k3/8/8/8/8/8/PPPP4/4K3 b - - 0 1", cartas: brancas("power-spike") });
    const e = { ...e0, lancesFeitos: { brancas: 24, pretas: 24 } };
    const d = jogar(e, "e8", "d8"); // a vez passa para as brancas: começa o 25º lance delas
    const tipos = d.tabuleiro.filter((p) => p?.cor === "brancas" && p.tipo !== "rei").map((p) => p!.tipo);
    expect(tipos.filter((t) => t !== "peao")).toHaveLength(2);
  });

  it("Odds: cerca de 2% dos lances dão lance extra", () => {
    let extras = 0;
    for (let semente = 0; semente < 3000; semente++) {
      const e0 = criarPartida({ cartas: brancas("odds") });
      const e = { ...e0, dadosCartas: { ...e0.dadosCartas, brancas: { ...e0.dadosCartas.brancas, poder: { semente } } } };
      if (jogar(e, "e2", "e4").vez === "brancas") extras++;
    }
    expect(extras).toBeGreaterThan(20);
    expect(extras).toBeLessThan(110);
  });
});

describe("Voanet, Femme Fatale e Salário Mínimo", () => {
  it("Voanet: sempre há 3 casas bloqueadas, sorteadas de novo a cada 5 lances", () => {
    const e0 = criarPartida({ cartas: brancas(null, "voanet") });
    const semente = (e0.dadosCartas.brancas.desvantagem as { semente: number }).semente;
    const com = (feitos: number) => ({ ...e0, lancesFeitos: { brancas: feitos, pretas: feitos } });
    const casas = (feitos: number) => casasSemSinal(com(feitos), "brancas", semente).slice().sort((a, b) => a - b);
    // As mesmas nos lances 0 a 4; outro sorteio a partir do 5º.
    for (let f = 1; f < 5; f++) expect(casas(f)).toEqual(casas(0));
    expect(casas(0)).toHaveLength(3);
    // Nenhum lance legal entra nelas.
    for (const f of [0, 5, 10]) {
      const bloqueadas = new Set(casas(f));
      expect(lancesLegais(com(f)).some((l) => bloqueadas.has(l.para))).toBe(false);
    }
  });

  it("Femme Fatale: só a dama dá xeque-mate", () => {
    // Mate de corredor com a torre (a1-a8) é proibido; com a dama em vez da torre, vale.
    const torre = criarPartida({ fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", cartas: brancas(null, "femme-fatale") });
    expect(lances(torre)).not.toContain("a1a8");
    const dama = criarPartida({ fen: "6k1/5ppp/8/8/8/8/8/Q5K1 w - - 0 1", cartas: brancas(null, "femme-fatale") });
    expect(lances(dama)).toContain("a1a8");
  });

  it("Salário Mínimo: sem orçamento, perde uma peça a cada vez sua", () => {
    const e0 = criarPartida({ fen: "4k3/8/8/8/8/8/PPP5/4K3 b - - 0 1", cartas: brancas(null, "salario-minimo") });
    const e = { ...e0, dadosCartas: { ...e0.dadosCartas, brancas: { ...e0.dadosCartas.brancas, desvantagem: { gasto: 100 } } } };
    const d = jogar(e, "e8", "d8");
    expect(d.tabuleiro.filter((p) => p?.cor === "brancas" && p.tipo === "peao")).toHaveLength(2);
  });
});

describe("Multitasking: perder a vez", () => {
  it("quem tem Multitasking perde a vez: nenhuma peça se mexe e a vez passa", () => {
    const e0 = criarPartida({ cartas: brancas(null, "multitasking") });
    const e = { ...e0, lancesFeitos: { brancas: 1, pretas: 1 } }; // 2º lance: pede as palavras
    const d = passarVez(e);
    expect(d.vez).toBe("pretas");
    expect(d.tabuleiro).toEqual(e.tabuleiro);
    expect(d.lancesFeitos.brancas).toBe(2);
    expect(d.eventos.at(-1)?.texto).toContain("perdeu a vez");
  });

  it("as palavras aparecem a cada 2 lances (no 2º, 4º, 6º...)", () => {
    const e0 = criarPartida({ cartas: brancas(null, "multitasking") });
    const com = (feitos: number) => ({ ...e0, lancesFeitos: { brancas: feitos, pretas: feitos } });
    expect([0, 1, 2, 3, 4, 5].map((f) => lanceDeMultitasking(com(f)))).toEqual([false, true, false, true, false, true]);
    expect(travaDePassar(com(0))).toContain("não há Multitasking");
  });

  it("sem a carta, ou em xeque, não dá para perder a vez", () => {
    expect(travaDePassar(criarPartida())).not.toBeNull();
    expect(() => passarVez(criarPartida())).toThrow();
    const xeque0 = criarPartida({ fen: "4r1k1/8/8/8/8/8/8/4K3 w - - 0 1", cartas: brancas(null, "multitasking") });
    const xeque = { ...xeque0, lancesFeitos: { brancas: 1, pretas: 1 } };
    expect(travaDePassar(xeque)).toContain("xeque");
  });
});
