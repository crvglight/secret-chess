import { describe, expect, it } from "vitest";
import {
  aplicarLance,
  casaDoNome as c,
  criarPartida,
  jogar,
  jogarPoder,
  lancesDaCarona,
  lancesDaCasa,
  lancesLegais,
  montadaEm,
  nomeCasa,
  obterCarta,
  type Estado,
  type OpcoesPartida,
} from "../index.ts";

const brancas = (poder: string | null, desvantagem: string | null = null): OpcoesPartida["cartas"] => ({
  brancas: { poder, desvantagem },
});
const destinos = (lances: { para: number }[]) => lances.map((l) => nomeCasa(l.para)).sort();

describe("Yuumi (carona)", () => {
  const inicio = () => criarPartida({ fen: "4k3/8/8/8/8/8/3P4/1N2K3 w - - 0 1", cartas: brancas("yuumi") });
  const montar = (e: Estado) => aplicarLance(e, { de: c("b1"), para: c("d2"), montada: "montar" });

  it("o cavalo sobe no peão e as duas ficam na mesma casa", () => {
    const e = inicio();
    expect(lancesDaCasa(e, c("b1")).some((l) => l.montada === "montar" && nomeCasa(l.para) === "d2")).toBe(true);
    const d = montar(e);
    expect(d.tabuleiro[c("b1")]).toBeNull();
    expect(d.tabuleiro[c("d2")]?.tipo).toBe("peao");
    expect(montadaEm(d, c("d2"))?.tipo).toBe("cavalo");
    expect(d.historico.at(-1)!.texto).toContain("carona");
  });

  it("na casa da carona, quem anda é sempre a de cima; a de baixo fica parada", () => {
    let e = montar(inicio());
    e = jogar(e, "e8", "f8");
    // Mexer na casa d2 move o cavalo (que desce); o peão de baixo não tem lances.
    expect(destinos(lancesDaCasa(e, c("d2")))).toEqual(["b1", "b3", "c4", "e4", "f1", "f3"]);
    expect(lancesDaCasa(e, c("d2")).every((l) => l.montada === "descer")).toBe(true);
    expect(destinos(lancesDaCarona(e, c("d2")))).toEqual(["b1", "b3", "c4", "e4", "f1", "f3"]);
    const desceu = aplicarLance(e, { de: c("d2"), para: c("f3"), montada: "descer" });
    expect(desceu.tabuleiro[c("f3")]?.tipo).toBe("cavalo");
    expect(desceu.tabuleiro[c("d2")]?.tipo).toBe("peao");
    expect(montadaEm(desceu, c("d2"))).toBeNull();
  });

  it("se a de baixo é capturada, as duas morrem", () => {
    const e0 = criarPartida({ fen: "4k3/8/8/b7/8/8/3P4/1N2K3 w - - 0 1", cartas: brancas("yuumi") });
    const e = aplicarLance(e0, { de: c("b1"), para: c("d2"), montada: "montar" });
    // O bispo preto de a5 captura o peão de d2, que levava o cavalo.
    const d = jogar(e, "a5", "d2");
    expect(d.tabuleiro[c("d2")]?.tipo).toBe("bispo");
    expect(Object.keys(d.montadas ?? {})).toHaveLength(0);
  });

  it("o rei nunca entra na carona", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/3PP3/4K3 w - - 0 1", cartas: brancas("yuumi") });
    expect(lancesLegais(e).some((l) => l.montada && nomeCasa(l.de) === "e1")).toBe(false);
    expect(lancesLegais(e).some((l) => l.montada && nomeCasa(l.para) === "e1")).toBe(false);
  });
});

describe("C4 e F5", () => {
  it("C4: a peça do adversário que para em c4 explode (e a casa deixa de ser segredo)", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/1n6/8/4K3 b - - 0 1", cartas: brancas("c4") });
    expect(jogar(e, "b3", "d4").tabuleiro[c("d4")]?.tipo).toBe("cavalo");
    const boom = jogar(e, "b3", "c5");
    expect(boom.tabuleiro[c("c5")]?.tipo).toBe("cavalo");
    const e2 = criarPartida({ fen: "4k3/8/8/8/8/8/1n6/4K3 b - - 0 1", cartas: brancas("c4") });
    const explodiu = jogar(e2, "b2", "c4");
    expect(explodiu.tabuleiro[c("c4")]).toBeNull();
    expect(explodiu.dadosCartas.brancas.poder).toMatchObject({ descoberta: true });
  });

  it("C4 é sempre c4, também quando a carta é das pretas", () => {
    const pretas = { pretas: { poder: "c4", desvantagem: null } };
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/1N6/4K3 w - - 0 1", cartas: pretas });
    expect(jogar(e, "b2", "c4").tabuleiro[c("c4")]).toBeNull();
    const e2 = criarPartida({ fen: "4k3/8/8/8/4B3/8/8/4K3 w - - 0 1", cartas: pretas });
    expect(jogar(e2, "e4", "f5").tabuleiro[c("f5")]?.tipo).toBe("bispo");
  });

  it("F5 é sempre f5, também quando a carta é das pretas", () => {
    const pretas = { pretas: { poder: "f5", desvantagem: null } };
    // c4 não faz nada para as pretas; f5 transforma a peça.
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/2b5/4K3 b - - 0 1", cartas: pretas });
    expect(jogar(e, "c2", "b3").tabuleiro[c("b3")]?.tipo).toBe("bispo");
    const e2 = criarPartida({ fen: "4k3/8/4b3/8/8/8/8/4K3 b - - 0 1", cartas: pretas });
    expect(jogar(e2, "e6", "f5").tabuleiro[c("f5")]?.tipo).not.toBe("bispo");
    const e3 = criarPartida({ fen: "4k3/8/8/8/8/1b6/8/4K3 b - - 0 1", cartas: pretas });
    expect(jogar(e3, "b3", "c4").tabuleiro[c("c4")]?.tipo).toBe("bispo");
  });

  it("F5: a sua peça que para em f5 vira outra (sempre a mesma no mesmo lance)", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1", cartas: brancas("f5") });
    const a = jogar(e, "c1", "f4"); // não é f5
    expect(a.tabuleiro[c("f4")]?.tipo).toBe("bispo");
    const e2 = criarPartida({ fen: "4k3/8/8/8/8/8/8/1B2K3 w - - 0 1", cartas: brancas("f5") });
    const b1 = jogar(e2, "b1", "f5");
    const b2 = jogar(e2, "b1", "f5");
    expect(b1.tabuleiro[c("f5")]?.tipo).not.toBe("bispo");
    expect(b1.tabuleiro[c("f5")]?.tipo).not.toBe("rei");
    expect(b1.tabuleiro[c("f5")]?.tipo).toBe(b2.tabuleiro[c("f5")]?.tipo);
  });
});

describe("C4 com o rei", () => {
  it("o rei do adversário que pisa em c4 explode e quem tem a carta vence", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/3K4/8/8 w - - 0 1", cartas: { pretas: { poder: "c4", desvantagem: null } } });
    const d = jogar(e, "d3", "c4");
    expect(d.resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "c4" });
  });
});

describe("Peãogonista", () => {
  /** Partida em que o peão escolhido das brancas é o de e4. */
  function comPeaoEm(fen: string): Estado {
    const e = criarPartida({ fen, cartas: brancas("peaogonista") });
    const id = e.tabuleiro[c("e4")]!.id;
    return { ...e, dadosCartas: { ...e.dadosCartas, brancas: { ...e.dadosCartas.brancas, poder: { sorteio: 0, pecaId: id, usada: false } } } };
  }

  it("na primeira captura o peão fica e o adversário perde o lance", () => {
    const e = comPeaoEm("4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1");
    const d = jogar(e, "d5", "e4");
    expect(d.tabuleiro[c("e4")]).toMatchObject({ tipo: "peao", cor: "brancas" });
    expect(d.tabuleiro[c("d5")]).toMatchObject({ tipo: "peao", cor: "pretas" });
    expect(d.vez).toBe("brancas");
    expect(d.dadosCartas.brancas.poder).toMatchObject({ usada: true });
  });

  it("na segunda captura ele cai normalmente", () => {
    let e = comPeaoEm("4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1");
    e = jogar(e, "d5", "e4"); // gasta a vida
    e = jogar(e, "e1", "e2");
    e = jogar(e, "d5", "e4");
    expect(e.tabuleiro[c("e4")]).toMatchObject({ tipo: "peao", cor: "pretas" });
  });

  it("o sorteio escolhe um dos seus peões e fica marcado só para você", () => {
    const e = criarPartida({ cartas: brancas("peaogonista") });
    const [d] = [jogar(e, "a2", "a3")];
    const id = (d.dadosCartas.brancas.poder as { pecaId: number }).pecaId;
    expect(d.tabuleiro.find((p) => p?.id === id)).toMatchObject({ tipo: "peao", cor: "brancas" });
  });
});

describe("Daltônico", () => {
  it("move a peça do adversário e ela captura outra peça dele", () => {
    // O bispo preto de b7 captura a dama preta de e4 (mesma diagonal).
    const e = criarPartida({ fen: "4k3/1b6/8/8/4q3/8/8/4K2R w - - 0 1", cartas: brancas("daltonico") });
    const d = jogarPoder(e, "b7", "e4");
    expect(d.tabuleiro[c("e4")]).toMatchObject({ tipo: "bispo", cor: "pretas" });
    expect(d.vez).toBe("pretas");
    expect(d.usosPoder.brancas).toBe(0);
  });

  it("não move o rei dele nem captura peça sua", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/4q3/8/8/R3K3 w - - 0 1", cartas: brancas("daltonico") });
    const poder = lancesLegais(e).filter((l) => l.poder === "daltonico");
    expect(poder.some((l) => nomeCasa(l.de) === "e8")).toBe(false);
    expect(poder.some((l) => nomeCasa(l.para) === "a1" || nomeCasa(l.para) === "e1")).toBe(false);
  });
});

describe("Kamikaze, Regigigas e Damas", () => {
  it("Kamikaze: se pode dar xeque, tem que dar", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1", cartas: brancas(null, "kamikaze") });
    // A torre de a1 dá xeque em a8: é o único lance permitido.
    expect(lancesLegais(e).map((l) => nomeCasa(l.de) + nomeCasa(l.para))).toEqual(["a1a8"]);
  });

  it("Kamikaze: sem xeque possível, joga normal", () => {
    const e = criarPartida({ fen: "7k/8/8/8/8/8/8/K7 w - - 0 1", cartas: brancas(null, "kamikaze") });
    expect(lancesLegais(e).length).toBe(3);
  });

  it("Regigigas: só peões nos 5 primeiros lances", () => {
    let e = criarPartida({ cartas: brancas(null, "regigigas") });
    expect(new Set(lancesLegais(e).map((l) => e.tabuleiro[l.de]!.tipo))).toEqual(new Set(["peao"]));
    for (const [b, p] of [["a2", "a3"], ["a7", "a6"], ["b2", "b3"], ["b7", "b6"], ["c2", "c3"], ["c7", "c6"], ["d2", "d3"], ["d7", "d6"], ["e2", "e3"], ["e7", "e6"]] as const) {
      e = jogar(e, b, p);
    }
    expect(lancesLegais(e).some((l) => e.tabuleiro[l.de]!.tipo === "cavalo")).toBe(true);
  });

  it("Damas é o novo nome de Capturas obrigatórias", () => {
    expect(obterCarta("capturas-obrigatorias").nome).toBe("Damas");
  });

  it("Damas: o rei não é obrigado a capturar", () => {
    // Só o rei pode capturar (o cavalo preto em d2): o resto joga normal.
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/3n4/4K2R w - - 0 1", cartas: brancas(null, "capturas-obrigatorias") });
    expect(lancesLegais(e).length).toBeGreaterThan(5);
    // Se outra peça pode capturar, é obrigado a capturar com ela (e não com o rei).
    const e2 = criarPartida({ fen: "4k3/8/8/8/8/8/3n4/3RK3 w - - 0 1", cartas: brancas(null, "capturas-obrigatorias") });
    expect(lancesLegais(e2).map((l) => nomeCasa(l.de) + nomeCasa(l.para))).toEqual(["d1d2"]);
  });

  it("obrigações nunca dão xeque-mate falso: em xeque, valem só os lances que salvam o rei", () => {
    // Rei branco em xeque pela torre de e8; a torre branca de a1 poderia capturar o peão de a7,
    // mas isso não tira o xeque. Antes, a Damas deixava zero lances (mate falso).
    const e = criarPartida({ fen: "k3r3/p7/8/8/8/8/8/R3K3 w - - 0 1", cartas: brancas(null, "capturas-obrigatorias") });
    const legais = lancesLegais(e).map((l) => nomeCasa(l.de) + nomeCasa(l.para));
    expect(legais.length).toBeGreaterThan(0);
    expect(legais).not.toContain("a1a7");
    // Kamikaze: um xeque que deixaria o próprio rei atacado não é obrigatório.
    const k = criarPartida({ fen: "k3r3/8/8/8/8/8/8/R3K3 w - - 0 1", cartas: brancas(null, "kamikaze") });
    expect(lancesLegais(k).length).toBeGreaterThan(0);
  });
});
