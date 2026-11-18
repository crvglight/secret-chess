import { describe, expect, it } from "vitest";
import { aleatorioComSemente, casaDoNome, criarPartida, escolherJogada, executarJogada } from "@xadrez/engine";
import { reconstruirPartida, type AcaoPartida, type PartidaSalva } from "./progresso.ts";

describe("replay", () => {
  it("refaz a partida a partir do estado inicial e das ações, chegando no mesmo final", () => {
    const rng = aleatorioComSemente(3);
    // Mão de cartas + caos + casas: o modo com mais coisas acontecendo.
    const inicial = criarPartida({ maoDeCartas: { rng }, caos: { rng }, casasEspeciais: { rng } });
    let e = inicial;
    const acoes: AcaoPartida[] = [];
    for (let i = 0; i < 24 && !e.resultado; i++) {
      const j = escolherJogada(e, "facil", { rng, tempoMs: 30 });
      if (j.carta !== null) acoes.push({ tipo: "carta", indice: j.carta });
      if (j.poder) acoes.push({ tipo: "poder", alvo: j.poder.alvo });
      acoes.push({ tipo: "lance", lance: j.lance });
      e = executarJogada(e, j);
    }
    const partida: PartidaSalva = {
      id: "1",
      data: 0,
      modo: { tipo: "local", regras: "mao" },
      inicial,
      acoes,
      vencedor: null,
      motivo: "",
      meioLances: e.meioLance,
    };
    const estados = reconstruirPartida(partida);
    expect(estados).toHaveLength(acoes.length + 1);
    expect(estados.at(-1)!.tabuleiro).toEqual(e.tabuleiro);
    expect(estados.at(-1)!.historico).toEqual(e.historico);
  });

  it("para no ponto em que uma ação deixa de valer", () => {
    const inicial = criarPartida();
    const partida: PartidaSalva = {
      id: "2",
      data: 0,
      modo: { tipo: "local", regras: "padrao" },
      inicial,
      acoes: [
        { tipo: "lance", lance: { de: casaDoNome("e2"), para: casaDoNome("e4") } },
        { tipo: "lance", lance: { de: casaDoNome("e2"), para: casaDoNome("e4") } }, // inválida: e2 já saiu
      ],
      vencedor: null,
      motivo: "",
      meioLances: 1,
    };
    expect(reconstruirPartida(partida)).toHaveLength(2);
  });
});

