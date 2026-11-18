import { describe, expect, it } from "vitest";
import { ocultarCartasDe } from "../ia/busca.ts";
import { montarMaos } from "../mao.ts";
import { sortearDraft } from "../draft.ts";
import {
  cartasAbertas,
  criarPartida,
  disfarcesDasCartas,
  infoPoder,
  jogar,
  jogarPoder,
  lancesLegais,
  usarPoder,
  type OpcoesPartida,
} from "../regras.ts";
import { aleatorioComSemente, sortearCartas } from "../sorteio.ts";
import { casaDoNome as c, casasDasPecas, nomeCasa } from "../tabuleiro.ts";
import type { Estado } from "../tipos.ts";

const branca = (id: string, slot: "poder" | "desvantagem" = "poder"): OpcoesPartida["cartas"] => ({
  brancas: { [slot]: id },
});

const destinos = (e: Estado, de: string) =>
  lancesLegais(e)
    .filter((l) => nomeCasa(l.de) === de && !l.poder)
    .map((l) => nomeCasa(l.para))
    .sort();

function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

describe("poderes da etapa E", () => {
  it("Necromante traz de volta a peça capturada mais valiosa", () => {
    let e = criarPartida({ fen: "4k3/8/8/8/8/8/r7/R3K3 b - - 0 1", cartas: branca("necromante") });
    e = jogar(e, "a2", "a1");
    expect(infoPoder(e).disponivel).toBe(true);
    e = usarPoder(e, c("b1"));
    expect(e.tabuleiro[c("b1")]).toMatchObject({ tipo: "torre", cor: "brancas" });
  });

  it("Necromante fica apagado sem peça para trazer", () => {
    expect(infoPoder(criarPartida({ cartas: branca("necromante") })).disponivel).toBe(false);
  });

  it("Sniper captura a distância sem sair do lugar", () => {
    const e = jogarPoder(criarPartida({ fen: "4k3/8/8/4p3/8/8/8/B3K3 w - - 0 1", cartas: branca("sniper") }), "a1", "e5");
    expect(e.tabuleiro[c("e5")]).toBeNull();
    expect(e.tabuleiro[c("a1")]?.tipo).toBe("bispo");
    expect(e.vez).toBe("pretas");
  });

  it("Clone cria um peão numa casa vizinha", () => {
    const e = jogarPoder(criarPartida({ cartas: branca("clone") }), "e2", "e3");
    expect(e.tabuleiro[c("e2")]?.tipo).toBe("peao");
    expect(e.tabuleiro[c("e3")]).toMatchObject({ tipo: "peao", cor: "brancas" });
    expect(e.tabuleiro[c("e3")]!.id).not.toBe(e.tabuleiro[c("e2")]!.id);
  });

  it("Ilusão disfarça a peça de peão até ela se mover", () => {
    let e = usarPoder(criarPartida({ cartas: branca("ilusao") }), c("b1"));
    expect(disfarcesDasCartas(e)).toEqual([{ casa: c("b1"), tipo: "peao", dono: "brancas" }]);
    e = jogar(e, "b1", "c3");
    expect(disfarcesDasCartas(e)).toEqual([]);
  });

  it("Contra-ataque captura de volta na hora", () => {
    const e = jogar(
      criarPartida({ fen: "4k3/8/8/3p4/4P3/5P2/8/4K3 b - - 0 1", cartas: branca("contra-ataque") }),
      "d5",
      "e4",
    );
    expect(e.tabuleiro[c("e4")]).toMatchObject({ tipo: "peao", cor: "brancas" });
    expect(e.tabuleiro[c("f3")]).toBeNull();
    expect(e.vez).toBe("brancas");
  });

  it("Rainha das sombras também anda como cavalo", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1", cartas: branca("rainha-das-sombras") });
    expect(destinos(e, "d4")).toHaveLength(35);
  });

  it("Bomba explode quem captura e as peças vizinhas (menos reis)", () => {
    let e = criarPartida({ fen: "4k3/8/8/3p1n2/4P3/3N4/8/4K3 w - - 0 1", cartas: branca("bomba") });
    e = jogar(usarPoder(e, c("e4")), "e1", "f1");
    e = jogar(e, "d5", "e4");
    for (const casa of ["e4", "d3", "f5"]) expect(e.tabuleiro[c(casa)]).toBeNull();
    expect(e.eventos.at(-1)?.texto).toContain("explodiu");
  });
});

describe("desvantagens da etapa E", () => {
  it("Peças pesadas: a mesma peça não se move em duas rodadas seguidas", () => {
    const e = sequencia(criarPartida({ cartas: branca("pecas-pesadas", "desvantagem") }), "g1-f3 a7-a6");
    expect(destinos(e, "f3")).toEqual([]);
    expect(destinos(e, "b1")).toEqual(["a3", "c3"]);
  });

  it("Rei medroso não captura", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/3p4/4K3 w - - 0 1", cartas: branca("rei-medroso", "desvantagem") });
    expect(destinos(e, "e1")).not.toContain("d2");
  });

  it("Espião: as cartas ficam abertas, inclusive para a IA", () => {
    const e = criarPartida({ cartas: { brancas: { poder: "escudo", desvantagem: "espiao" } } });
    expect(cartasAbertas(e, "brancas")).toBe(true);
    expect(ocultarCartasDe(e, "brancas").cartas.brancas.poder).toBe("escudo");
  });

  it("Maldição leva uma peça a cada 10 lances", () => {
    let e = criarPartida({ cartas: branca("maldicao", "desvantagem") });
    for (let i = 0; i < 5; i++) e = sequencia(e, "g1-f3 g8-f6 f3-g1 f6-g8");
    expect(casasDasPecas(e, "brancas")).toHaveLength(15);
    expect(casasDasPecas(e, "pretas")).toHaveLength(16);
  });

  it("Lado errado: só roque longo e peão não captura para a esquerda", () => {
    const peoes = criarPartida({ fen: "4k3/8/8/2p1p3/3P4/8/8/4K3 w - - 0 1", cartas: branca("lado-errado", "desvantagem") });
    expect(destinos(peoes, "d4")).toEqual(["d5", "e5"]);
    const roque = criarPartida({ fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1", cartas: branca("lado-errado", "desvantagem") });
    expect(destinos(roque, "e1")).toContain("c1");
    expect(destinos(roque, "e1")).not.toContain("g1");
  });

  it("Lentidão fica fora dos sorteios enquanto não houver relógio", () => {
    const rng = aleatorioComSemente(12);
    for (let i = 0; i < 400; i++) {
      const s = sortearCartas(rng);
      expect([s.brancas.desvantagem, s.pretas.desvantagem]).not.toContain("lentidao");
      const d = sortearDraft(rng);
      expect([...d.brancas.desvantagens, ...d.pretas.desvantagens]).not.toContain("lentidao");
    }
    const m = montarMaos(rng);
    expect([...m.mao.brancas, ...m.baralho.brancas]).not.toContain("lentidao");
  });
});
