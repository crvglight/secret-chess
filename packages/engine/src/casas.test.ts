import { describe, expect, it } from "vitest";
import { casasAtoladas, casasNaNevoa, casasVisiveis, DURACAO_MURALHA, ladosComVigia, TIPOS_DE_CASA } from "./casas.ts";
import { escolherJogada, executarJogada } from "./ia/busca.ts";
import { criarPartida, jogar, lancesLegais, motivoBloqueio, type OpcoesPartida } from "./regras.ts";
import { aleatorioComSemente } from "./sorteio.ts";
import { casaDoNome as c, nomeCasa } from "./tabuleiro.ts";
import type { CasaEspecial, Estado } from "./tipos.ts";

/** Partida com as casas especiais escolhidas (em vez de sorteadas). */
function comCasas(lista: [string, CasaEspecial["tipo"], (1 | -1)?][], opcoes: OpcoesPartida = {}): Estado {
  const e = criarPartida({ ...opcoes, casasEspeciais: {} });
  return {
    ...e,
    casas: { ...e.casas!, lista: lista.map(([nome, tipo, direcao]) => ({ casa: c(nome), tipo, ...(direcao ? { direcao } : {}) })) },
  };
}

function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

const destinos = (e: Estado, de: string) =>
  lancesLegais(e)
    .filter((l) => nomeCasa(l.de) === de && !l.poder)
    .map((l) => nomeCasa(l.para))
    .sort();

describe("Casas especiais", () => {
  it("o sorteio põe um de cada tipo em cada metade, espelhado", () => {
    const e = criarPartida({ casasEspeciais: { rng: aleatorioComSemente(5) } });
    const lista = e.casas!.lista;
    expect(lista).toHaveLength(8);
    expect(new Set(lista.map((x) => x.casa)).size).toBe(8);
    for (const x of lista) {
      expect(lista).toContainEqual(expect.objectContaining({ casa: 63 - x.casa, tipo: x.tipo }));
      expect(e.tabuleiro[x.casa]).toBeNull();
    }
  });

  it("Portal: a peça sai no outro portal", () => {
    const e = jogar(comCasas([["e3", "portal"], ["e6", "portal"]]), "e2", "e3");
    expect(e.tabuleiro[c("e3")]).toBeNull();
    expect(e.tabuleiro[c("e6")]).toMatchObject({ tipo: "peao", cor: "brancas" });
    expect(e.casas!.registro.at(-1)?.texto).toContain("portal");
  });

  it("Lama: a peça atolada não se move na próxima vez do dono", () => {
    let e = jogar(comCasas([["e4", "lama"]]), "e2", "e4");
    expect(casasAtoladas(e)).toEqual([c("e4")]);
    e = jogar(e, "a7", "a6");
    expect(destinos(e, "e4")).toEqual([]);
    expect(motivoBloqueio(e, c("e4"), c("e5"))).toMatchObject({ casa: true, nome: "Lama" });
    e = jogar(e, "d2", "d3");
    e = jogar(e, "a6", "a5");
    expect(destinos(e, "e4")).toEqual(["e5"]);
  });

  it("Baú: +1 uso do poder, e o baú some", () => {
    const e = jogar(comCasas([["e4", "bau"]], { cartas: { brancas: { poder: "escudo" } } }), "e2", "e4");
    expect(e.usosPoder.brancas).toBe(2);
    expect(casasVisiveis(e)).toEqual([]);
  });

  it("Baú no modo Mão de cartas: compra uma carta", () => {
    const e0 = criarPartida({ casasEspeciais: {}, maoDeCartas: { rng: aleatorioComSemente(1) } });
    const e = jogar({ ...e0, casas: { ...e0.casas!, lista: [{ casa: c("e4"), tipo: "bau" }] } }, "e2", "e4");
    expect(e.mao!.mao.brancas).toHaveLength(4);
  });

  it("Muralha: ninguém para nem passa por ela enquanto está de pé", () => {
    const e = comCasas([["e4", "muralha"], ["b5", "muralha"]]);
    expect(destinos(e, "e2")).toEqual(["e3"]);
    expect(motivoBloqueio(e, c("e2"), c("e4"))).toMatchObject({ casa: true, nome: "Muralha" });
    // O bispo de f1 não passa por b5 (depois de abrir o caminho com e2-e3).
    const depois = jogar(jogar(e, "e2", "e3"), "a7", "a6");
    expect(destinos(depois, "f1")).toEqual(["c4", "d3", "e2"]);
    // Depois de 10 lances de cada lado, a muralha cai.
    expect(casasVisiveis({ ...e, meioLance: DURACAO_MURALHA })).toEqual([]);
  });

  it("a IA joga com casas especiais sem lance ilegal", () => {
    const rng = aleatorioComSemente(9);
    let e = criarPartida({ casasEspeciais: { rng } });
    for (let i = 0; i < 30 && !e.resultado; i++) e = executarJogada(e, escolherJogada(e, "medio", { rng, tempoMs: 50 }));
    expect(e.historico.length).toBeGreaterThan(0);
  }, 60_000);


  it("cada partida sorteia 4 tipos de casa, entre os 16", () => {
    expect(TIPOS_DE_CASA).toHaveLength(16);
    const tipos = new Set(criarPartida({ casasEspeciais: { rng: aleatorioComSemente(2) } }).casas!.lista.map((x) => x.tipo));
    expect(tipos.size).toBe(4);
  });

  it("Gelo: a peça escorrega mais uma casa", () => {
    const e = jogar(comCasas([["e3", "gelo"]]), "e2", "e3");
    expect(e.tabuleiro[c("e3")]).toBeNull();
    expect(e.tabuleiro[c("e4")]?.tipo).toBe("peao");
  });

  it("Trampolim: no próximo lance a peça pula 2 casas", () => {
    const e = sequencia(comCasas([["e3", "trampolim"]]), "e2-e3 a7-a6");
    expect(destinos(e, "e3")).toEqual(["c3", "c5", "e4", "e5", "g3", "g5"]);
  });

  it("Torre de vigia: quem está nela vê os segredos do adversário", () => {
    const e = jogar(comCasas([["d3", "vigia"]]), "d2", "d3");
    expect([...ladosComVigia(e)]).toEqual(["brancas"]);
  });

  it("Santuário: a peça nele não pode ser capturada", () => {
    const e = comCasas([["e4", "santuario"]], { fen: "4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1" });
    expect(destinos(e, "d5")).toEqual(["d4"]);
    expect(motivoBloqueio(e, c("d5"), c("e4"))).toMatchObject({ casa: true, nome: "Santuário" });
  });

  it("Santuário + Capturas obrigatórias: a peça protegida não obriga a capturar", () => {
    const e = comCasas([["e4", "santuario"]], {
      fen: "4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1",
      cartas: { pretas: { poder: null, desvantagem: "capturas-obrigatorias" } },
    });
    expect(destinos(e, "d5")).toEqual(["d4"]);
    expect(lancesLegais(e).length).toBeGreaterThan(1);
  });

  it("Forja: o peão vira cavalo ou bispo", () => {
    const e = comCasas([["e3", "forja"]]);
    expect(lancesLegais(e).filter((l) => nomeCasa(l.para) === "e3").map((l) => l.promocao).sort()).toEqual(["bispo", "cavalo"]);
    expect(jogar(e, "e2", "e3", "bispo").tabuleiro[c("e3")]?.tipo).toBe("bispo");
  });

  it("Vulcão: a cada 6 lances de cada lado destrói as peças em volta", () => {
    let e = comCasas([["e3", "vulcao"]]);
    for (let i = 0; i < 3; i++) e = sequencia(e, "b1-a3 b8-a6 a3-b1 a6-b8");
    for (const casa of ["d2", "e2", "f2"]) expect(e.tabuleiro[c(casa)]).toBeNull();
    expect(e.tabuleiro[c("e1")]?.tipo).toBe("rei");
  });

  it("Esteira: no fim da rodada empurra a peça para o lado", () => {
    const e = sequencia(comCasas([["e3", "esteira", 1]]), "e2-e3 a7-a6");
    expect(e.tabuleiro[c("e3")]).toBeNull();
    expect(e.tabuleiro[c("f3")]?.tipo).toBe("peao");
  });

  it("Espelho: troca de lugar com a peça do outro espelho", () => {
    const e = sequencia(comCasas([["e3", "espelho"], ["d6", "espelho"]]), "a2-a3 d7-d6 e2-e3");
    expect(e.tabuleiro[c("d6")]).toMatchObject({ tipo: "peao", cor: "brancas" });
    expect(e.tabuleiro[c("e3")]).toMatchObject({ tipo: "peao", cor: "pretas" });
  });

  it("Areia movediça: a peça que fica 2 rodadas afunda", () => {
    const e = sequencia(comCasas([["e3", "areia"]]), "e2-e3 a7-a6 a2-a3 a6-a5 b2-b3");
    expect(e.tabuleiro[c("e3")]).toBeNull();
  });

  it("Altar: a peça é sacrificada e o poder ganha um uso", () => {
    const e = jogar(comCasas([["e3", "altar"]], { cartas: { brancas: { poder: "escudo" } } }), "e2", "e3");
    expect(e.tabuleiro[c("e3")]).toBeNull();
    expect(e.usosPoder.brancas).toBe(2);
  });

  it("Névoa: só a peça parada nela fica disfarçada", () => {
    const e = comCasas([["e3", "nevoa"], ["d6", "nevoa"]]);
    expect(casasNaNevoa(e).size).toBe(0); // névoas vazias não escondem nada
    const depois = sequencia(e, "e2-e3 d7-d6");
    expect([...casasNaNevoa(depois)]).toEqual([
      [c("e3"), "brancas"],
      [c("d6"), "pretas"],
    ]);
    expect(casasNaNevoa(depois).has(c("e2"))).toBe(false);
  });

  it("Casa da sorte: sorteia um efeito e some", () => {
    const e = jogar(comCasas([["e3", "sorte"]], { cartas: { brancas: { poder: "escudo" } } }), "e2", "e3");
    expect(casasVisiveis(e)).toEqual([]);
    expect(e.casas!.registro.at(-1)?.texto).toContain("Casa da sorte");
  });
});
