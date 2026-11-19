import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { criarPartida, infoPoder, jogar, lancesLegais, motivoBloqueio, usarPoder } from "../regras.ts";
import { casaDoNome as c, nomeCasa } from "../tabuleiro.ts";
import type { Estado } from "../tipos.ts";
import { CARTAS_OFICIAIS } from "./index.ts";

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

describe("registro de cartas", () => {
  it("todo arquivo da pasta cartas está na lista oficial", async () => {
    const arquivos = readdirSync(new URL(".", import.meta.url)).filter(
      (f) => f.endsWith(".ts") && f !== "index.ts" && !f.endsWith(".test.ts"),
    );
    for (const arquivo of arquivos) {
      const modulo = await import(/* @vite-ignore */ `./${arquivo}`);
      expect(CARTAS_OFICIAIS, `${arquivo} não está em cartas/index.ts`).toContain(modulo.default);
    }
  });

  it("ids únicos e pesos de 1 a 5", () => {
    const ids = CARTAS_OFICIAIS.map((carta) => carta.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const carta of CARTAS_OFICIAIS) {
      expect(carta.peso).toBeGreaterThanOrEqual(1);
      expect(carta.peso).toBeLessThanOrEqual(5);
    }
  });
});

describe("Escudo", () => {
  const fen = "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1";
  const partida = () => criarPartida({ fen, cartas: { brancas: { poder: "escudo" } } });

  it("a peça protegida não pode ser capturada na rodada do adversário", () => {
    let e = usarPoder(partida(), c("e4"));
    expect(e.eventos).toHaveLength(1);
    e = jogar(e, "e1", "d1");
    expect(destinos(e, "d5")).toEqual(["d4"]);
    expect(motivoBloqueio(e, c("d5"), c("e4"))?.cartaId).toBe("escudo");
  });

  it("a proteção acaba quando a vez volta para o dono", () => {
    let e = usarPoder(partida(), c("e4"));
    e = sequencia(e, "e1-d1 e8-e7 d1-e1");
    expect(destinos(e, "d5")).toEqual(["d4", "e4"]);
  });

  it("só pode ser usado uma vez e em peça própria", () => {
    expect(() => usarPoder(partida(), c("d5"))).toThrow("Alvo inválido");
    let e = usarPoder(partida(), c("e4"));
    expect(() => usarPoder(e, c("e1"))).toThrow();
    e = sequencia(e, "e1-d1 e8-e7");
    expect(infoPoder(e).disponivel).toBe(false);
    expect(infoPoder(e).usosRestantes).toBe(0);
  });
});

describe("Cavalo saltador", () => {
  const partida = () => criarPartida({ cartas: { brancas: { poder: "cavalo-saltador" } } });

  it("os alvos são os cavalos que podem se mover", () => {
    expect(infoPoder(partida()).alvos.map(nomeCasa).sort()).toEqual(["b1", "g1"]);
  });

  it("o cavalo escolhido faz dois lances seguidos", () => {
    let e = usarPoder(partida(), c("g1"));
    expect(new Set(lancesLegais(e).map((l) => nomeCasa(l.de)))).toEqual(new Set(["g1"]));
    e = jogar(e, "g1", "f3");
    expect(e.vez).toBe("brancas");
    expect(new Set(lancesLegais(e).map((l) => nomeCasa(l.de)))).toEqual(new Set(["f3"]));
    e = jogar(e, "f3", "g5");
    expect(e.vez).toBe("pretas");
    expect(e.usosPoder.brancas).toBe(1);
    // Os dois eventos são do primeiro meio-lance (índice 0).
    expect(e.eventos.map((ev) => ev.meioLance)).toEqual([0, 0]);
  });

  it("o segundo salto não captura o rei (a partida acaba no xeque-mate)", () => {
    const inicio = criarPartida({ fen: "4k3/8/8/8/4N3/8/8/4K3 w - - 0 1", cartas: { brancas: { poder: "cavalo-saltador" } } });
    const e = jogar(usarPoder(inicio, c("e4")), "e4", "d6"); // xeque no primeiro salto
    expect(e.vez).toBe("brancas");
    expect(lancesLegais(e).some((l) => nomeCasa(l.para) === "e8")).toBe(false);
  });

  it("depois do salto duplo, os lances voltam ao normal", () => {
    let e = usarPoder(partida(), c("g1"));
    e = sequencia(e, "g1-f3 f3-g5 e7-e6");
    expect(lancesLegais(e).length).toBeGreaterThan(20);
  });

  it("pode ser usado duas vezes", () => {
    let e = usarPoder(partida(), c("g1"));
    e = sequencia(e, "g1-f3 f3-g5 e7-e6");
    e = usarPoder(e, c("b1"));
    e = sequencia(e, "b1-c3 c3-d5 d7-d6");
    expect(infoPoder(e).usosRestantes).toBe(0);
    expect(infoPoder(e).disponivel).toBe(false);
  });
});

describe("Peão veloz", () => {
  const partida = () => criarPartida({ cartas: { brancas: { poder: "peao-veloz" } } });

  it("o peão anda 2 casas fora da fileira inicial", () => {
    let e = sequencia(partida(), "e2-e3 a7-a6");
    expect(destinos(e, "e3")).toEqual(["e4", "e5"]);
    e = jogar(e, "e3", "e5");
    expect(e.enPassant).toBe(c("e4"));
    expect(e.eventos).toHaveLength(1);
  });

  it("não anda 2 casas com o caminho bloqueado", () => {
    const e = sequencia(partida(), "e2-e4 e7-e6");
    expect(destinos(e, "e4")).toEqual(["e5"]);
  });

  it("não vale para o adversário", () => {
    const e = sequencia(partida(), "a2-a3 e7-e6 a3-a4");
    expect(destinos(e, "e6")).toEqual(["e5"]);
  });
});

describe("Bispos tímidos", () => {
  const fen = "4k3/8/8/8/8/2p5/1B6/4K3 w - - 0 1";

  it("o bispo não captura, mas anda", () => {
    const e = criarPartida({ fen, cartas: { brancas: { desvantagem: "bispos-timidos" } } });
    expect(destinos(e, "b2")).toEqual(["a1", "a3", "c1"]);
    expect(motivoBloqueio(e, c("b2"), c("c3"))?.nome).toBe("Bispos tímidos");
  });

  it("sem a carta, o bispo captura normalmente", () => {
    expect(destinos(criarPartida({ fen }), "b2")).toContain("c3");
  });
});

describe("Rainha preguiçosa", () => {
  const partida = () => criarPartida({ cartas: { brancas: { desvantagem: "rainha-preguicosa" } } });

  it("a dama não se move nos 5 primeiros lances", () => {
    let e = sequencia(partida(), "e2-e4 b8-c6 a2-a3 c6-b8 a3-a4 b8-c6 h2-h3 c6-b8");
    expect(destinos(e, "d1")).toEqual([]);
    expect(motivoBloqueio(e, c("d1"), c("h5"))?.cartaId).toBe("rainha-preguicosa");
    e = sequencia(e, "h3-h4 b8-c6");
    expect(destinos(e, "d1")).toContain("h5");
  });
});

describe("Batalha de peões", () => {
  const fen = "4k3/8/8/3p4/4P3/8/8/4K3 b - - 0 1";

  it("perde ao ficar com menos peões que o adversário", () => {
    const e = jogar(criarPartida({ fen, cartas: { brancas: { desvantagem: "batalha-de-peoes" } } }), "d5", "e4");
    expect(e.resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "batalha-de-peoes" });
    expect(e.eventos.at(-1)?.texto).toContain("Batalha de peões");
  });

  it("com o mesmo número de peões, a partida segue", () => {
    const e = jogar(criarPartida({ fen, cartas: { brancas: { desvantagem: "batalha-de-peoes" } } }), "e8", "e7");
    expect(e.resultado).toBeNull();
  });
});
