import { describe, expect, it } from "vitest";
import { criarPartida, jogar, lancesLegais, nomeCasa, type OpcoesPartida } from "../index.ts";

const pretas = (poder: string | null, desvantagem: string | null = null): OpcoesPartida["cartas"] => ({
  pretas: { poder, desvantagem },
});
const brancas = (poder: string | null, desvantagem: string | null = null): OpcoesPartida["cartas"] => ({
  brancas: { poder, desvantagem },
});
const lances = (e: ReturnType<typeof criarPartida>) => lancesLegais(e).map((l) => nomeCasa(l.de) + nomeCasa(l.para));

describe("Gigante da Colina", () => {
  it("no centro, a peça só cai para quem está encostado", () => {
    // Cavalo preto em e5 (centro). Torre branca de longe e cavalo branco não capturam; o peão encostado sim.
    const e = criarPartida({ fen: "4k3/8/8/4n3/3P4/5N2/8/4R1K1 w - - 0 1", cartas: pretas("gigante-da-colina") });
    const l = lances(e);
    expect(l).not.toContain("e1e5");
    expect(l).not.toContain("f3e5");
    expect(l).toContain("d4e5");
  });

  it("fora do centro, tudo normal", () => {
    // Cavalo preto em f5 (fora do centro): a torre branca captura de longe.
    const e = criarPartida({ fen: "4k3/8/8/5n2/8/8/8/4KR2 w - - 0 1", cartas: pretas("gigante-da-colina") });
    expect(lances(e)).toContain("f1f5");
  });
});

describe("Ansiedade", () => {
  it("os peões encostados no rei não se afastam dele", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/3PPP1P/4K3 w - - 0 1", cartas: brancas(null, "ansiedade") });
    const l = lances(e);
    expect(l).not.toContain("d2d3");
    expect(l).not.toContain("e2e4");
    expect(l).not.toContain("f2f3");
    expect(l).toContain("h2h3"); // longe do rei: livre
    // O rei pode andar (e então os peões param de estar encostados).
    expect(l).toContain("e1f1");
  });
});

describe("CLT", () => {
  it("o 7º lance é só de peão; depois volta ao normal", () => {
    let e = criarPartida({ fen: "4k3/8/8/8/8/8/P7/4K1N1 w - - 0 1", cartas: brancas(null, "clt") });
    const vaiVolta: [string, string][] = [["g1", "f3"], ["f3", "g1"]];
    for (let i = 0; i < 6; i++) {
      const [de, para] = vaiVolta[i % 2]!;
      e = jogar(e, de, para);
      e = jogar(e, i % 2 === 0 ? "e8" : "d8", i % 2 === 0 ? "d8" : "e8");
    }
    expect(new Set(lancesLegais(e).map((l) => e.tabuleiro[l.de]!.tipo))).toEqual(new Set(["peao"]));
    e = jogar(e, "a2", "a3");
    e = jogar(e, "e8", "d8");
    expect(lances(e)).toContain("g1f3");
  });

  it("em xeque, o 7º lance pode ser de qualquer peça", () => {
    let e = criarPartida({ fen: "4k3/8/8/8/8/8/P7/4K1N1 w - - 0 1", cartas: brancas(null, "clt") });
    e = { ...e, lancesFeitos: { ...e.lancesFeitos, brancas: 6 } };
    expect(lances(e)).toEqual(["a2a3", "a2a4"]);
    const xeque = criarPartida({ fen: "4k3/8/8/8/8/8/P7/r3K1N1 w - - 0 1", cartas: brancas(null, "clt") });
    const emXeque = { ...xeque, lancesFeitos: { ...xeque.lancesFeitos, brancas: 6 } };
    expect(lancesLegais(emXeque).some((l) => emXeque.tabuleiro[l.de]!.tipo === "rei")).toBe(true);
  });
});
