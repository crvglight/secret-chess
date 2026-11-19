import { describe, expect, it } from "vitest";
import { analisarTurno, momentosChave, resumirLado, textoNota, turnosDaPartida } from "./analise-partida.ts";
import { casaDoNome as c, criarPartida, lancesLegais, type AcaoPartida, type Estado } from "./index.ts";

const lance = (de: string, para: string): AcaoPartida => ({ tipo: "lance", lance: { de: c(de), para: c(para) } });
const TEMPO = 300;

/** Analisa a única jogada `acao` feita na posição `inicial`. */
function analisar(inicial: Estado, acao: AcaoPartida) {
  const [turno] = turnosDaPartida(inicial, [acao]);
  return analisarTurno(turno!, 0, TEMPO);
}

describe("análise depois da partida", () => {
  it("divide as ações em jogadas (carta + poder + lance)", () => {
    const inicial = criarPartida();
    const turnos = turnosDaPartida(inicial, [lance("e2", "e4"), lance("e7", "e5"), lance("g1", "f3")]);
    expect(turnos.map((t) => [t.cor, t.passoAntes, t.passoDepois])).toEqual([
      ["brancas", 0, 1],
      ["pretas", 1, 2],
      ["brancas", 2, 3],
    ]);
  });

  it("entregar a dama de graça é erro grave e mostra o lance melhor", () => {
    // A dama branca em d4 vai para d5, onde o peão de e6 captura.
    const inicial = criarPartida({ fen: "4k3/8/4p3/8/3Q4/8/8/4K3 w - - 0 1" });
    const j = analisar(inicial, lance("d4", "d5"));
    expect(j.classificacao).toBe("erro-grave");
    expect(j.comentarios.some((x) => x.tipo === "melhor")).toBe(true);
    expect(j.precisao).toBeLessThan(30);
  });

  it("o lance certo é o melhor lance", () => {
    // Captura da dama preta solta.
    const inicial = criarPartida({ fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1" });
    const j = analisar(inicial, lance("d1", "d5"));
    expect(j.classificacao).toBe("melhor");
    expect(j.jogouAMelhor).toBe(true);
  });

  it("aponta o mate que passou", () => {
    // Mate de corredor: Ta1-a8#. Jogou outra coisa.
    const inicial = criarPartida({ fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1" });
    const j = analisar(inicial, lance("g1", "f1"));
    expect(j.comentarios.find((x) => x.tipo === "mate")?.texto).toContain("mate em 1");
    expect(j.melhor.texto).toContain("a1");
  });

  it("poder: aponta o momento perdido e elogia o bom uso", () => {
    // Sniper: o bispo de a1 captura a dama de e5 sem sair do lugar (o peão de d6 a defende).
    const fen = "k7/8/3p4/4q3/8/8/8/B5K1 w - - 0 1";
    const inicial = criarPartida({ fen, cartas: { brancas: { poder: "sniper", desvantagem: null } } });
    const perdido = analisar(inicial, lance("g1", "f1"));
    expect(perdido.comentarios.some((x) => x.tipo === "oportunidade" && x.texto.includes("Sniper"))).toBe(true);

    const tiro = lancesLegais(inicial).find((l) => l.poder && l.para === c("e5"))!;
    const bom = analisar(inicial, { tipo: "lance", lance: tiro });
    expect(bom.classificacao).toBe("brilhante");
    expect(bom.comentarios.some((x) => x.tipo === "poder" && x.texto.includes("Ótimo uso"))).toBe(true);
  });

  it("desvantagem: mostra quando ela tirou um lance bom", () => {
    // Sem recuo: a torre de a5 não pode voltar para capturar a dama solta em a1.
    const inicial = criarPartida({
      fen: "k7/8/8/R7/8/8/8/q5K1 w - - 0 1",
      cartas: { brancas: { poder: null, desvantagem: "sem-recuo" } },
    });
    const j = analisar(inicial, lance("g1", "g2"));
    expect(j.comentarios.find((x) => x.tipo === "desvantagem")?.texto).toContain("Sem recuo");
  });

  it("resumo por lado e momentos-chave", () => {
    const inicial = criarPartida({ fen: "4k3/8/4p3/8/3Q4/8/8/4K3 w - - 0 1" });
    const j = analisar(inicial, lance("d4", "d5"));
    const resumo = resumirLado([j], "brancas")!;
    expect(resumo.contagem["erro-grave"]).toBe(1);
    expect(resumirLado([j], "pretas")).toBeNull();
    expect(momentosChave([j])).toHaveLength(1);
  });

  it("escreve as notas", () => {
    expect(textoNota(130)).toBe("+1,3");
    expect(textoNota(-40)).toBe("−0,4");
    expect(textoNota(999_997)).toBe("mate em 2");
  });
});
