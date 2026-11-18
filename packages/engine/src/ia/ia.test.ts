import { describe, expect, it } from "vitest";
import { CARTAS_OFICIAIS } from "../cartas/index.ts";
import { aplicarLance, criarPartida, usarPoder } from "../regras.ts";
import { aleatorioComSemente, sortearCartas } from "../sorteio.ts";
import { casaDoNome as c, nomeCasa } from "../tabuleiro.ts";
import type { Estado } from "../tipos.ts";
import { analisarAoVivo, analisarPosicao, escolherJogada, ocultarCartasDe, type JogadaIA, type NivelIA } from "./busca.ts";

function executar(estado: Estado, j: JogadaIA): Estado {
  const depois = j.poder ? usarPoder(estado, j.poder.alvo) : estado;
  return aplicarLance(depois, j.lance);
}

const lanceTexto = (j: Pick<JogadaIA, "lance">) => `${nomeCasa(j.lance.de)}-${nomeCasa(j.lance.para)}`;

describe("IA", () => {
  it.each<NivelIA>(["facil", "medio", "dificil"])("captura o rei quando pode (%s)", (nivel) => {
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/4r3/4K3 b - - 0 1" });
    expect(lanceTexto(escolherJogada(e, nivel))).toBe("e2-e1");
  });

  it.each<NivelIA>(["facil", "medio", "dificil"])("tira o rei de uma captura (%s)", (nivel) => {
    // A torre preta em e2 ameaça o rei branco em e1; as brancas não podem capturá-la.
    const e = criarPartida({ fen: "4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1" });
    const depois = executar(e, escolherJogada(e, nivel, { rng: aleatorioComSemente(1) }));
    expect(depois.tabuleiro[c("e1")]).toBeNull();
  });

  it("o analisador lista os melhores lances, com nota e continuação", () => {
    const e = criarPartida({ fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1" });
    const analise = analisarPosicao(e, { tempoMs: 1500, quantidade: 3 });
    expect(analise.lances.length).toBeGreaterThan(0);
    expect(analise.lances.length).toBeLessThanOrEqual(3);
    expect(lanceTexto(analise.lances[0]!)).toBe("d1-d5");
    expect(analise.lances[0]!.avaliacao).toBeGreaterThan(300); // fica com uma torre a mais
    expect(analise.lances[0]!.linha.length).toBeGreaterThan(0);
    // Do melhor para o pior.
    const notas = analise.lances.map((l) => l.avaliacao);
    expect([...notas].sort((a, b) => b - a)).toEqual(notas);
  });

  it("a análise ao vivo avisa a cada profundidade completa", () => {
    const e = criarPartida({ fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1" });
    const profundidades: number[] = [];
    analisarAoVivo(e, (a) => profundidades.push(a.profundidade), { profundidadeMax: 3 });
    expect(profundidades).toEqual([1, 2, 3]);
  });

  it("o difícil ganha a dama solta", () => {
    const e = criarPartida({ fen: "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1" });
    expect(lanceTexto(escolherJogada(e, "dificil"))).toBe("d1-d5");
  });

  it("respeita as próprias cartas (bispos tímidos não capturam)", () => {
    const e = criarPartida({
      fen: "4k3/8/8/8/8/2q5/1B6/4K3 w - - 0 1",
      cartas: { brancas: { desvantagem: "bispos-timidos" } },
    });
    expect(lanceTexto(escolherJogada(e, "dificil"))).not.toBe("b2-c3");
  });

  it("usa o Escudo para salvar uma peça presa", () => {
    // O cavalo preto em c2 ataca o rei (e1) e a dama presa (a1): só o Escudo salva os dois.
    const e = criarPartida({
      fen: "4k3/8/8/8/8/8/PPn5/QR2K3 w - - 0 1",
      cartas: { brancas: { poder: "escudo" } },
    });
    const j = escolherJogada(e, "medio");
    expect(j.poder).toEqual({ alvo: c("a1") });
  });

  it("não enxerga as cartas do adversário", () => {
    const e = criarPartida({ cartas: sortearCartas(aleatorioComSemente(3)) });
    const visao = ocultarCartasDe(e, "pretas");
    expect(visao.cartas.pretas).toEqual({ poder: null, desvantagem: null });
    expect(visao.cartas.brancas).toEqual(e.cartas.brancas);
  });

  it("joga com cada uma das cartas sem travar nem fazer lance ilegal", () => {
    const rng = aleatorioComSemente(21);
    for (const carta of CARTAS_OFICIAIS) {
      const outras = sortearCartas(rng);
      const cartas = { ...outras, brancas: { ...outras.brancas, [carta.tipo]: carta.id } };
      let e = criarPartida({ cartas });
      for (let i = 0; i < 16 && !e.resultado; i++) {
        e = executar(e, escolherJogada(e, i % 2 ? "facil" : "medio", { rng, tempoMs: 40 }));
      }
      expect(e.historico.length, carta.id).toBeGreaterThan(0);
    }
  }, 120_000);

  it("com Teleporte (poder em forma de lance), escolhe uma jogada válida e salva o rei", () => {
    const e = criarPartida({
      fen: "4k3/8/8/8/8/8/8/N3K2r w - - 0 1",
      cartas: { brancas: { poder: "teleporte" } },
    });
    // A torre preta ameaça o rei: a jogada da IA (com ou sem teleporte) precisa evitar a captura.
    const j = escolherJogada(e, "medio");
    const depois = executar(e, j);
    expect(depois.resultado).toBeNull();
  });

  it("joga partidas inteiras com cartas sorteadas sem lance ilegal", () => {
    const rng = aleatorioComSemente(11);
    for (let partida = 0; partida < 4; partida++) {
      let e = criarPartida({ cartas: sortearCartas(rng) });
      for (let i = 0; i < 80 && !e.resultado; i++) {
        e = executar(e, escolherJogada(e, i % 2 ? "facil" : "medio", { rng, tempoMs: 200 }));
      }
      expect(e.historico.length).toBeGreaterThan(0);
    }
  }, 60_000);
});
