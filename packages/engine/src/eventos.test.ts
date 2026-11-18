import { describe, expect, it } from "vitest";
import { EVENTOS, eventoAtivo, LANCES_ENTRE_EVENTOS, proximoEvento, restanteDoEvento } from "./eventos.ts";
import { escolherJogada, executarJogada } from "./ia/busca.ts";
import { criarPartida, jogar, lancesLegais, motivoBloqueio, type OpcoesPartida } from "./regras.ts";
import { aleatorioComSemente } from "./sorteio.ts";
import { casaDoNome as c, nomeCasa } from "./tabuleiro.ts";
import type { Estado } from "./tipos.ts";

/** Partida do Caos com a sequência de eventos escolhida. */
function caos(ids: string[], opcoes: OpcoesPartida = {}): Estado {
  const e = criarPartida({ ...opcoes, caos: {} });
  return { ...e, caos: { ...e.caos!, sequencia: ids } };
}

function sequencia(estado: Estado, lances: string): Estado {
  return lances.split(" ").reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, estado);
}

/** 8 meios-lances de cavalos indo e voltando: dispara o primeiro evento. */
const ATE_O_EVENTO = "g1-f3 g8-f6 f3-g1 f6-g8 g1-f3 g8-f6 f3-g1 f6-g8";
/** Depois de 2 lances de peão, mais 6 meios-lances completam os 8. */
const SEIS_LANCES = "g1-f3 g8-f6 f3-g1 f6-g8 g1-f3 g8-f6";

describe("Caos", () => {
  it("o primeiro evento chega depois de 8 meios-lances, e o próximo é anunciado", () => {
    let e = caos(["revolucao", "tregua"]);
    expect(proximoEvento(e)).toEqual({ evento: expect.objectContaining({ id: "revolucao" }), emMeiosLances: LANCES_ENTRE_EVENTOS });
    e = sequencia(e, "g1-f3 g8-f6 f3-g1 f6-g8 g1-f3 g8-f6 f3-g1");
    expect(e.caos!.registro).toHaveLength(0);
    e = jogar(e, "f6", "g8");
    expect(e.caos!.registro).toEqual([{ meioLance: 8, id: "revolucao" }]);
    expect(proximoEvento(e)?.evento.id).toBe("tregua");
  });

  it("Terremoto: os peões andam uma casa", () => {
    const e = sequencia(caos(["terremoto"]), ATE_O_EVENTO);
    expect(e.tabuleiro[c("e3")]?.tipo).toBe("peao");
    expect(e.tabuleiro[c("e2")]).toBeNull();
    expect(e.tabuleiro[c("e6")]?.tipo).toBe("peao");
  });

  it("Revolução: o peão mais avançado de cada lado vira dama", () => {
    const e = sequencia(caos(["revolucao"]), `e2-e4 d7-d5 ${SEIS_LANCES}`);
    expect(e.tabuleiro[c("e4")]?.tipo).toBe("dama");
    expect(e.tabuleiro[c("d5")]?.tipo).toBe("dama");
  });

  it("Trégua: ninguém captura por 2 rodadas, depois volta ao normal", () => {
    let e = sequencia(caos(["tregua"]), `e2-e4 d7-d5 ${SEIS_LANCES}`);
    expect(eventoAtivo(e)?.id).toBe("tregua");
    expect(restanteDoEvento(e)).toBe(4);
    expect(lancesLegais(e).some((l) => nomeCasa(l.de) === "e4" && nomeCasa(l.para) === "d5")).toBe(false);
    expect(motivoBloqueio(e, c("e4"), c("d5"))).toMatchObject({ evento: true, nome: "Trégua" });
    e = sequencia(e, "f3-g1 f6-g8 g1-f3 g8-f6");
    expect(eventoAtivo(e)).toBeNull();
    expect(lancesLegais(e).some((l) => nomeCasa(l.de) === "e4" && nomeCasa(l.para) === "d5")).toBe(true);
  });

  it("Tempestade: peças de longo alcance andam no máximo 2 casas", () => {
    const e = sequencia(caos(["tempestade"]), `e2-e4 e7-e5 ${SEIS_LANCES}`);
    const destinosBispo = lancesLegais(e)
      .filter((l) => nomeCasa(l.de) === "f1")
      .map((l) => nomeCasa(l.para));
    expect(destinosBispo).toContain("d3");
    expect(destinosBispo).not.toContain("c4");
    expect(destinosBispo).not.toContain("a6");
  });

  it("Apagão: as cartas param de funcionar", () => {
    const fen = "4k3/8/8/8/8/2p5/1B6/4K3 w - - 0 1";
    let e = caos(["apagao"], { fen, cartas: { brancas: { desvantagem: "bispos-timidos" } } });
    const podeCapturar = (x: Estado) => lancesLegais(x).some((l) => nomeCasa(l.de) === "b2" && nomeCasa(l.para) === "c3");
    expect(podeCapturar(e)).toBe(false);
    e = sequencia(e, "e1-d1 e8-d8 d1-e1 d8-e8 e1-d1 e8-d8 d1-e1 d8-e8");
    expect(eventoAtivo(e)?.id).toBe("apagao");
    expect(podeCapturar(e)).toBe(true);
  });

  it("Espelho: os lados trocam de poder e destrocam no fim", () => {
    let e = caos(["espelho", "tregua"], { cartas: { brancas: { poder: "escudo" }, pretas: { poder: "peao-veloz" } } });
    e = sequencia(e, ATE_O_EVENTO);
    expect(e.cartas.brancas.poder).toBe("peao-veloz");
    expect(e.cartas.pretas.poder).toBe("escudo");
    e = sequencia(e, ATE_O_EVENTO);
    expect(e.cartas.brancas.poder).toBe("escudo");
    expect(e.cartas.pretas.poder).toBe("peao-veloz");
  });

  it("a sequência sorteada usa só eventos conhecidos e não repete o mesmo seguido", () => {
    const e = criarPartida({ caos: { rng: aleatorioComSemente(3) } });
    const ids = new Set(EVENTOS.map((ev) => ev.id));
    e.caos!.sequencia.forEach((id, i) => {
      expect(ids.has(id)).toBe(true);
      if (i > 0) expect(id).not.toBe(e.caos!.sequencia[i - 1]);
    });
  });

  it("a IA joga partidas no Caos sem lance ilegal", () => {
    const rng = aleatorioComSemente(6);
    let e = criarPartida({ caos: { rng } });
    for (let i = 0; i < 40 && !e.resultado; i++) e = executarJogada(e, escolherJogada(e, "medio", { rng, tempoMs: 50 }));
    expect(e.caos!.registro.length).toBeGreaterThan(0);
  }, 60_000);
});
