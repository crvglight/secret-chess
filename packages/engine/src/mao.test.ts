import { describe, expect, it } from "vitest";
import { obterCarta } from "./cartas/index.ts";
import { escolherJogada, executarJogada, ocultarCartasDe } from "./ia/busca.ts";
import { jogarCartaDaMao, LANCES_POR_CARTA, MAO_INICIAL, MAO_MAXIMA, travaDaMao } from "./mao.ts";
import { criarPartida, jogar, lancesLegais, usarPoder } from "./regras.ts";
import { aleatorioComSemente } from "./sorteio.ts";
import { casaDoNome as c, nomeCasa } from "./tabuleiro.ts";
import type { Estado } from "./tipos.ts";

const partida = (semente = 1, fen?: string) =>
  criarPartida({ fen, cartas: { brancas: { poder: "escudo" } }, maoDeCartas: { rng: aleatorioComSemente(semente) } });

/** Troca a mão das brancas por uma escolhida (para testar cartas específicas). */
function comMao(e: Estado, ids: string[]): Estado {
  return { ...e, mao: { ...e.mao!, mao: { ...e.mao!.mao, brancas: ids } } };
}

function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

describe("Mão de cartas", () => {
  it("nenhum poder se repete na mão nem no baralho de um lado", () => {
    for (let semente = 1; semente <= 50; semente++) {
      const m = criarPartida({ maoDeCartas: { rng: aleatorioComSemente(semente) } }).mao!;
      for (const cor of ["brancas", "pretas"] as const) {
        const todas = [...m.mao[cor], ...m.baralho[cor]];
        expect(new Set(todas).size).toBe(todas.length);
        expect(m.mao[cor]).toHaveLength(MAO_INICIAL);
      }
    }
  });

  it("começa com 3 cartas, sem poder fixo e com baralhos de pesos iguais", () => {
    const e = partida();
    expect(e.cartas.brancas.poder).toBeNull();
    for (const cor of ["brancas", "pretas"] as const) {
      expect(e.mao!.mao[cor]).toHaveLength(MAO_INICIAL);
      e.mao!.mao[cor].forEach((id) => expect(obterCarta(id).tipo).toBe("poder"));
    }
    const pesos = (ids: string[]) => ids.map((id) => obterCarta(id).peso);
    expect(pesos([...e.mao!.mao.brancas, ...e.mao!.baralho.brancas])).toEqual(
      pesos([...e.mao!.mao.pretas, ...e.mao!.baralho.pretas]),
    );
  });

  it("jogar uma carta põe o poder em jogo, sem gastar o lance, uma por rodada", () => {
    let e = comMao(partida(), ["escudo", "peao-veloz"]);
    e = jogarCartaDaMao(e, 0);
    expect(e.cartas.brancas.poder).toBe("escudo");
    expect(e.usosPoder.brancas).toBe(1);
    expect(e.mao!.mao.brancas).toEqual(["peao-veloz"]);
    expect(e.vez).toBe("brancas");
    expect(travaDaMao(e)).toContain("já jogou");
  });

  it("a carta vale na rodada do adversário e sai de jogo na vez seguinte do dono", () => {
    let e = comMao(partida(1, "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1"), ["escudo"]);
    e = usarPoder(jogarCartaDaMao(e, 0), c("e4"));
    e = jogar(e, "e1", "d1");
    // Na vez das pretas o escudo ainda protege o peão de e4.
    expect(lancesLegais(e).some((l) => nomeCasa(l.de) === "d5" && nomeCasa(l.para) === "e4")).toBe(false);
    e = jogar(e, "e8", "e7");
    expect(e.cartas.brancas.poder).toBeNull();
    expect(e.mao!.jogada.brancas).toBeNull();
    expect(e.eventos.some((ev) => ev.texto.includes("Jogou a carta Escudo"))).toBe(true);
  });

  it("carta de efeito contínuo vale só naquela rodada", () => {
    let e = comMao(sequencia(partida(), "e2-e3 a7-a6"), ["peao-veloz"]);
    e = jogarCartaDaMao(e, 0);
    expect(lancesLegais(e).some((l) => nomeCasa(l.de) === "e3" && nomeCasa(l.para) === "e5")).toBe(true);
    e = sequencia(e, "a2-a3 a6-a5");
    expect(lancesLegais(e).some((l) => nomeCasa(l.de) === "e3" && nomeCasa(l.para) === "e5")).toBe(false);
  });

  it(`compra uma carta a cada ${LANCES_POR_CARTA} lances, até ${MAO_MAXIMA}`, () => {
    let e = partida();
    const ida = "g1-f3 g8-f6 f3-g1 f6-g8";
    for (let i = 0; i < 5; i++) e = sequencia(e, ida);
    expect(e.lancesFeitos.brancas).toBe(LANCES_POR_CARTA);
    expect(e.mao!.mao.brancas).toHaveLength(MAO_INICIAL + 1);
    expect(e.mao!.mao.pretas).toHaveLength(MAO_INICIAL + 1);
  });

  it("a IA não enxerga a mão do adversário", () => {
    const visao = ocultarCartasDe(partida(), "pretas");
    expect(visao.mao!.mao.pretas).toEqual([]);
    expect(visao.mao!.baralho.pretas).toEqual([]);
    expect(visao.mao!.mao.brancas).toHaveLength(MAO_INICIAL);
  });

  it("a IA joga partidas com mão de cartas sem lance ilegal", () => {
    const rng = aleatorioComSemente(4);
    for (let partidaN = 0; partidaN < 3; partidaN++) {
      let e = partida(10 + partidaN);
      for (let i = 0; i < 30 && !e.resultado; i++) {
        e = executarJogada(e, escolherJogada(e, "medio", { rng, tempoMs: 60 }));
      }
      expect(e.historico.length).toBeGreaterThan(0);
    }
  }, 60_000);
});
