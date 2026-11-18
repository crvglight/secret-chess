import { describe, expect, it } from "vitest";
import { definirCarta } from "./carta.ts";
import { registrarCarta } from "./cartas/index.ts";
import { aplicarLance, casaDoReiEmXeque, criarPartida, emXeque, jogar, lancesLegais, motivoBloqueio } from "./regras.ts";
import { casaDoNome as c, nomeCasa } from "./tabuleiro.ts";
import type { Estado } from "./tipos.ts";

/** Joga uma sequência como "e2-e4 e7-e5". */
function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

const destinos = (estado: Estado, de: string) =>
  lancesLegais(estado)
    .filter((l) => l.de === c(de))
    .map((l) => nomeCasa(l.para))
    .sort();

describe("regras básicas", () => {
  it("a posição inicial tem 20 lances e começa com as brancas", () => {
    const e = criarPartida();
    expect(e.vez).toBe("brancas");
    expect(lancesLegais(e)).toHaveLength(20);
  });

  it("em xeque, só valem lances que tiram o rei do xeque", () => {
    // Torre preta em e2 ataca o rei em e1; a torre branca de a1 não ajuda.
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1" });
    expect(emXeque(e)).toBe(true);
    expect(casaDoReiEmXeque(e)).toBe(c("e1"));
    expect(new Set(lancesLegais(e).map((l) => nomeCasa(l.de)))).toEqual(new Set(["e1"]));
    expect(destinos(e, "e1")).toEqual(["d1", "e2", "f1"]);
    expect(motivoBloqueio(e, c("a1"), c("a2"))).toMatchObject({ xeque: true });
  });

  it("em xeque, dá para bloquear com outra peça", () => {
    const e = criarPartida({ fen: "4k3/4r3/8/8/8/8/3B4/4K3 w - - 0 1" });
    expect(destinos(e, "d2")).toEqual(["e3"]);
  });

  it("sem lance que tire o rei do xeque é xeque-mate", () => {
    const e = jogar(criarPartida({ fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1" }), "a1", "a8");
    expect(e.resultado).toEqual({ vencedor: "brancas", motivo: "xeque-mate" });
  });

  it("o rei não pode ir para casa atacada", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/3r4/4K3 w - - 0 1" });
    expect(emXeque(e)).toBe(false);
    expect(destinos(e, "e1")).toEqual(["d2", "f1"]);
  });

  it("peça cravada não pode sair da frente do rei", () => {
    const e = criarPartida({ fen: "4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1" });
    expect(destinos(e, "e2")).toEqual([]);
  });

  it("o rei nunca é capturado: quem não tem saída leva xeque-mate", () => {
    const e = sequencia(criarPartida(), "f2-f3 e7-e5 g2-g4 d8-h4");
    expect(e.resultado).toEqual({ vencedor: "pretas", motivo: "xeque-mate" });
  });

  it("sem lance e fora do xeque é afogamento (empate)", () => {
    const e = jogar(criarPartida({ fen: "7k/8/8/6Q1/8/8/8/K7 w - - 0 1" }), "g5", "g6");
    expect(e.resultado).toEqual({ vencedor: null, motivo: "afogamento" });
  });

  it("o roque não passa por casa atacada", () => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/5r2/4K2R w K - 0 1" });
    expect(destinos(e, "e1")).not.toContain("g1");
    const livre = jogar(criarPartida({ fen: "4k3/8/8/8/8/8/r7/4K2R w K - 0 1" }), "e1", "g1");
    expect(livre.tabuleiro[c("g1")]?.tipo).toBe("rei");
    expect(livre.tabuleiro[c("f1")]?.tipo).toBe("torre");
    expect(livre.historico[0]?.texto).toBe("O-O");
  });

  it("mover o rei tira o direito de roque", () => {
    const e = sequencia(criarPartida({ fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1" }), "e1-e2 e8-e7");
    expect(e.roque).toEqual({ brancas: { curto: false, longo: false }, pretas: { curto: false, longo: false } });
  });

  it("en passant captura o peão que andou duas casas", () => {
    const e = sequencia(criarPartida(), "e2-e4 a7-a6 e4-e5 d7-d5 e5-d6");
    expect(e.tabuleiro[c("d5")]).toBeNull();
    expect(e.tabuleiro[c("d6")]?.tipo).toBe("peao");
    expect(e.historico.at(-1)?.captura).toBe("peao");
  });

  it("promove a dama por padrão, ou à peça escolhida", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    expect(jogar(criarPartida({ fen }), "a7", "a8").tabuleiro[c("a8")]?.tipo).toBe("dama");
    expect(jogar(criarPartida({ fen }), "a7", "a8", "cavalo").tabuleiro[c("a8")]?.tipo).toBe("cavalo");
  });

  it("recusa lance ilegal e não altera o estado original", () => {
    const e = criarPartida();
    expect(() => jogar(e, "e2", "e5")).toThrow("Lance ilegal");
    const depois = jogar(e, "e2", "e4");
    expect(e.tabuleiro[c("e2")]?.tipo).toBe("peao");
    expect(depois.tabuleiro[c("e2")]).toBeNull();
  });

  it("quem fica sem lance (fora do xeque) empata por afogamento", () => {
    registrarCarta(
      definirCarta({
        id: "teste-trava",
        nome: "Trava (teste)",
        tipo: "desvantagem",
        peso: 1,
        descricao: "Depois do primeiro lance das brancas, você não tem lances.",
        filtrarLances: ({ estado, dono }, lances, jogador) =>
          jogador === dono && estado.meioLance > 0 ? [] : lances,
      }),
    );
    const e = jogar(criarPartida({ cartas: { pretas: { desvantagem: "teste-trava" } } }), "e2", "e4");
    expect(e.resultado).toEqual({ vencedor: null, motivo: "afogamento" });
  });

  it("empata depois de 50 lances sem captura nem lance de peão", () => {
    const e = jogar(criarPartida({ fen: "4k3/8/8/8/8/8/8/R3K3 w - - 99 60" }), "a1", "a2");
    expect(e.resultado).toEqual({ vencedor: null, motivo: "50-lances" });
  });

  it("sem cartas, motivoBloqueio não acusa nada", () => {
    expect(motivoBloqueio(criarPartida(), c("e2"), c("e5"))).toBeNull();
  });

  it("recusa carta no lugar errado", () => {
    expect(() => criarPartida({ cartas: { brancas: { poder: "bispos-timidos" } } })).toThrow();
    expect(() => aplicarLance(criarPartida(), { de: 0, para: 0 })).toThrow();
  });
});
