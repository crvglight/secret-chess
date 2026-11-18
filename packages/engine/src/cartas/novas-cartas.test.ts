import { describe, expect, it } from "vitest";
import {
  criarPartida,
  destaquesDasCartas,
  infoPoder,
  jogar,
  jogarPoder,
  lancesLegais,
  motivoBloqueio,
  usarPoder,
  type OpcoesPartida,
} from "../regras.ts";
import { casaDoNome as c, nomeCasa } from "../tabuleiro.ts";
import type { Estado } from "../tipos.ts";

function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

/** Destinos normais (sem lances de poder) da peça em `de`, em ordem alfabética. */
const destinos = (estado: Estado, de: string) =>
  lancesLegais(estado)
    .filter((l) => l.de === c(de) && !l.poder)
    .map((l) => nomeCasa(l.para))
    .sort();

const branca = (id: string, slot: "poder" | "desvantagem" = "poder"): OpcoesPartida["cartas"] => ({
  brancas: { [slot]: id },
});

describe("poderes novos", () => {
  it("Teleporte leva a peça para a sua metade e gasta o lance", () => {
    const e0 = criarPartida({ cartas: branca("teleporte") });
    expect(infoPoder(e0).modo).toBe("lance");
    expect(infoPoder(e0).alvos).not.toContain(c("e1"));
    const e = jogarPoder(e0, "b1", "d3");
    expect(e.tabuleiro[c("d3")]?.tipo).toBe("cavalo");
    expect(e.tabuleiro[c("b1")]).toBeNull();
    expect(e.vez).toBe("pretas");
    expect(e.usosPoder.brancas).toBe(0);
    expect(() => jogarPoder(e0, "b1", "d5")).toThrow("Lance ilegal");
  });

  it("Congelar trava uma peça do adversário por uma rodada", () => {
    let e = criarPartida({ fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", cartas: branca("congelar") });
    e = jogar(usarPoder(e, c("d5")), "e1", "d1");
    expect(destinos(e, "d5")).toEqual([]);
    expect(motivoBloqueio(e, c("d5"), c("d4"))?.cartaId).toBe("congelar");
    expect(destaquesDasCartas(e)).toEqual([expect.objectContaining({ casa: c("d5"), publico: true })]);
    e = sequencia(e, "e8-e7 d1-e1");
    expect(destinos(e, "d5")).toEqual(["d4", "e4"]);
  });

  it("Armadilha captura a peça do adversário que para na casa", () => {
    let e = usarPoder(criarPartida({ cartas: branca("armadilha") }), c("e5"));
    expect(destaquesDasCartas(e)).toEqual([expect.objectContaining({ casa: c("e5"), publico: false })]);
    e = sequencia(e, "e2-e4 e7-e5");
    expect(e.tabuleiro[c("e5")]).toBeNull();
    expect(e.eventos.at(-1)?.texto).toContain("capturou");
    expect(destaquesDasCartas(e)).toEqual([]);
  });

  it("Armadilha não captura o rei", () => {
    let e = criarPartida({ fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1", cartas: branca("armadilha") });
    e = sequencia(usarPoder(e, c("e7")), "e1-d1 e8-e7");
    expect(e.tabuleiro[c("e7")]?.tipo).toBe("rei");
    expect(e.resultado).toBeNull();
  });

  it("Troca de lugar troca duas peças suas de tipos diferentes", () => {
    const e0 = criarPartida({ cartas: branca("troca-de-lugar") });
    const e = jogarPoder(e0, "d1", "e1");
    expect(e.tabuleiro[c("d1")]?.tipo).toBe("rei");
    expect(e.tabuleiro[c("e1")]?.tipo).toBe("dama");
    expect(() => jogarPoder(e0, "b1", "g1")).toThrow(); // dois cavalos
    expect(() => jogarPoder(e0, "e2", "e1")).toThrow(); // peão na primeira fileira
  });

  it("Dama imortal volta para a casa inicial uma vez", () => {
    const e = jogar(
      criarPartida({ fen: "3qk3/8/8/8/3Q4/8/8/4K3 b - - 0 1", cartas: branca("dama-imortal") }),
      "d8",
      "d4",
    );
    expect(e.tabuleiro[c("d1")]).toMatchObject({ tipo: "dama", cor: "brancas" });
    expect(e.dadosCartas.brancas.poder).toEqual({ usada: true });
  });

  it("Peões guerreiros capturam para a frente", () => {
    const fen = "4k3/8/8/8/4p3/4P3/8/4K3 w - - 0 1";
    expect(destinos(criarPartida({ fen, cartas: branca("peoes-guerreiros") }), "e3")).toEqual(["e4"]);
    expect(destinos(criarPartida({ fen }), "e3")).toEqual([]);
  });

  it("Recuo tático anda para trás, mas não até a primeira fileira", () => {
    const e = sequencia(criarPartida({ cartas: branca("recuo-tatico") }), "e2-e4 a7-a6");
    expect(destinos(e, "e4")).toEqual(["e3", "e5"]);
    expect(destinos(e, "d2")).toEqual(["d3", "d4"]);
  });

  it("Promoção antecipada promove na 6ª fileira", () => {
    const e = jogar(
      criarPartida({ fen: "4k3/8/8/4P3/8/8/8/4K3 w - - 0 1", cartas: branca("promocao-antecipada") }),
      "e5",
      "e6",
    );
    expect(e.tabuleiro[c("e6")]?.tipo).toBe("dama");
  });

  it("Cavalaria pesada: cavalo anda também como rei", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1", cartas: branca("cavalaria-pesada") });
    expect(destinos(e, "d4")).toHaveLength(16);
  });

  it("Torres ágeis: torre anda 1 casa na diagonal", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1", cartas: branca("torres-ageis") });
    expect(destinos(e, "d4")).toHaveLength(18);
  });

  it("Rei guerreiro anda 2 casas, sem duplicar o roque", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3K4/8/8/8 w - - 0 1", cartas: branca("rei-guerreiro") });
    expect(destinos(e, "d4")).toHaveLength(16);
    const roque = criarPartida({ fen: "4k3/8/8/8/8/8/8/4K2R w K - 0 1", cartas: branca("rei-guerreiro") });
    const paraG1 = lancesLegais(roque).filter((l) => l.de === c("e1") && l.para === c("g1"));
    expect(paraG1).toEqual([expect.objectContaining({ especial: "roque-curto" })]);
  });

  it("Fantasma atravessa uma peça própria", () => {
    const e = criarPartida({ cartas: branca("fantasma") });
    expect(destinos(e, "a1")).toEqual(["a3", "a4", "a5", "a6", "a7"]);
    expect(destinos(e, "c1")).toEqual(["a3", "e3", "f4", "g5", "h6"]);
  });

  it("Avanço em massa move dois peões diferentes", () => {
    let e = usarPoder(criarPartida({ cartas: branca("avanco-em-massa") }));
    expect(destinos(e, "g1")).toEqual([]);
    e = jogar(e, "e2", "e4");
    expect(e.vez).toBe("brancas");
    expect(destinos(e, "e4")).toEqual([]);
    e = jogar(e, "d2", "d4");
    expect(e.vez).toBe("pretas");
    expect(e.usosPoder.brancas).toBe(1);
  });

  it("Segunda chance volta para antes do seu último lance", () => {
    const e0 = criarPartida({ cartas: branca("segunda-chance") });
    expect(infoPoder(e0).disponivel).toBe(false);
    let e = sequencia(e0, "e2-e4 e7-e5");
    e = usarPoder(e);
    expect(e.tabuleiro[c("e2")]?.tipo).toBe("peao");
    expect(e.tabuleiro[c("e7")]?.tipo).toBe("peao");
    expect(e.vez).toBe("brancas");
    expect(e.historico).toHaveLength(0);
    expect(e.usosPoder.brancas).toBe(0);
    e = sequencia(e, "d2-d4 d7-d5");
    expect(infoPoder(e).disponivel).toBe(false);
  });

  it("Bispo camaleão anda 1 casa na reta", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3B4/8/8/4K3 w - - 0 1", cartas: branca("bispo-camaleao") });
    expect(destinos(e, "d4")).toHaveLength(17);
  });

  it("Guarda real: peão não captura peça encostada no rei", () => {
    const fen = "4k3/8/8/8/8/3p4/4N3/4K3 b - - 0 1";
    expect(destinos(criarPartida({ fen, cartas: branca("guarda-real") }), "d3")).toEqual(["d2"]);
    expect(destinos(criarPartida({ fen }), "d3")).toEqual(["d2", "e2"]);
  });
});

describe("desvantagens novas", () => {
  const desv = (id: string) => branca(id, "desvantagem");

  it("Dama frágil: perde ao ficar sem dama", () => {
    const e = jogar(criarPartida({ fen: "3qk3/8/8/8/3Q4/8/8/4K3 b - - 0 1", cartas: desv("dama-fragil") }), "d8", "d4");
    expect(e.resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "dama-fragil" });
  });

  it("Capturas obrigatórias: se pode capturar, tem que capturar", () => {
    const e = criarPartida({ fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", cartas: desv("capturas-obrigatorias") });
    expect(lancesLegais(e).map((l) => `${nomeCasa(l.de)}-${nomeCasa(l.para)}`)).toEqual(["e4-d5"]);
  });

  it("Capturas obrigatórias ignora capturas bloqueadas por outra carta", () => {
    let e = criarPartida({
      fen: "4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1",
      cartas: { brancas: { desvantagem: "capturas-obrigatorias" }, pretas: { poder: "escudo" } },
    });
    e = jogar(usarPoder(e, c("d5")), "e8", "e7");
    expect(lancesLegais(e).length).toBeGreaterThan(1);
    expect(e.resultado).toBeNull();
  });

  it("Sem roque", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/8/4K2R w K - 0 1", cartas: desv("sem-roque") });
    expect(destinos(e, "e1")).not.toContain("g1");
  });

  it("Rei preso nos 10 primeiros lances", () => {
    const e = sequencia(criarPartida({ cartas: desv("rei-preso") }), "e2-e4 e7-e5");
    expect(destinos(e, "e1")).toEqual([]);
    expect(motivoBloqueio(e, c("e1"), c("e2"))?.cartaId).toBe("rei-preso");
  });

  it("Cavalos cansados descansam uma rodada", () => {
    let e = sequencia(criarPartida({ cartas: desv("cavalos-cansados") }), "g1-f3 a7-a6");
    expect(destinos(e, "f3")).toEqual([]);
    expect(destinos(e, "b1")).toEqual(["a3", "c3"]);
    e = sequencia(e, "a2-a3 a6-a5");
    expect(destinos(e, "f3").length).toBeGreaterThan(0);
  });

  it("Torres curtas andam até 3 casas", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1", cartas: desv("torres-curtas") });
    expect(destinos(e, "a1")).toEqual(["a2", "a3", "a4", "b1", "c1", "d1"]);
  });

  it("Sem recuo: peças não voltam", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1", cartas: desv("sem-recuo") });
    expect(destinos(e, "d4")).toEqual(["b5", "c6", "e6", "f5"]);
  });

  it("Pacifista não captura no começo", () => {
    const e = criarPartida({ fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", cartas: desv("pacifista") });
    expect(destinos(e, "e4")).toEqual(["e5"]);
  });

  it("Cavalos tímidos não capturam", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/2p5/8/1N2K3 w - - 0 1", cartas: desv("cavalos-timidos") });
    expect(destinos(e, "b1")).toEqual(["a3", "d2"]);
  });

  it("Peões lentos não andam 2 casas", () => {
    expect(destinos(criarPartida({ cartas: desv("peoes-lentos") }), "e2")).toEqual(["e3"]);
  });

  it("Centro proibido", () => {
    const e = criarPartida({ cartas: desv("centro-proibido") });
    expect(destinos(e, "e2")).toEqual(["e3"]);
    expect(destinos(e, "d2")).toEqual(["d3"]);
  });

  it("Passos curtos: dama anda até 3 casas", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/8/Q3K3 w - - 0 1", cartas: desv("passos-curtos") });
    expect(destinos(e, "a1")).toHaveLength(9);
  });

  it("Prazo: perde depois de 12 lances sem capturar", () => {
    let e = criarPartida({ fen: "k7/8/8/8/8/8/8/K7 w - - 0 1", cartas: desv("prazo") });
    for (let i = 0; i < 11; i++) e = sequencia(e, i % 2 ? "a2-a1 b8-a8" : "a1-a2 a8-b8");
    expect(e.resultado).toBeNull();
    e = jogar(e, "a2", "a1"); // 12º lance sem capturar
    expect(e.resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "prazo" });
  });

  it("Prazo: capturar zera a contagem", () => {
    const e = jogar(criarPartida({ fen: "k7/8/8/8/8/8/p7/K7 w - - 0 1", cartas: desv("prazo") }), "a1", "a2");
    expect(e.dadosCartas.brancas.desvantagem).toEqual({ semCapturar: 0 });
  });

  it("Fronteira: não entra nas 2 últimas fileiras, mas pode capturar o rei", () => {
    const e = criarPartida({ fen: "k7/8/8/8/8/8/8/R3K3 w - - 0 1", cartas: desv("fronteira") });
    expect(destinos(e, "a1")).toEqual(["a2", "a3", "a4", "a5", "a6", "a8", "b1", "c1", "d1"]);
  });

  it("Exército pequeno: perde com 4 peças ou menos", () => {
    const e = jogar(
      criarPartida({ fen: "4k3/8/8/3p4/4P3/8/P6P/R3K3 b - - 0 1", cartas: desv("exercito-pequeno") }),
      "d5",
      "e4",
    );
    expect(e.resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "exercito-pequeno" });
  });

  it("Rei impaciente: no 6º lance sem mexer o rei, só ele joga", () => {
    const e = sequencia(
      criarPartida({ fen: "k7/7p/8/8/8/8/PPP5/K7 w - - 0 1", cartas: desv("rei-impaciente") }),
      "a2-a3 h7-h6 b2-b3 h6-h5 c2-c3 h5-h4 a3-a4 h4-h3 b3-b4 a8-b8",
    );
    expect(new Set(lancesLegais(e).map((l) => nomeCasa(l.de)))).toEqual(new Set(["a1"]));
  });
});
