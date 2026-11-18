import { describe, expect, it } from "vitest";
import { registrarCarta } from "./cartas/index.ts";
import { criarCartaPersonalizada, descreverModelo, type DefinicaoCarta } from "./personalizadas.ts";
import { criarPartida, jogar, lancesLegais } from "./regras.ts";
import { nomeCasa } from "./tabuleiro.ts";
import type { Estado } from "./tipos.ts";

/** Registra a carta e começa uma partida com ela nas brancas. */
function comCarta(d: DefinicaoCarta, fen?: string): Estado {
  const carta = criarCartaPersonalizada(d);
  registrarCarta(carta);
  return criarPartida({ fen, cartas: { brancas: { [carta.tipo]: carta.id } } });
}

const destinos = (e: Estado, de: string) =>
  lancesLegais(e)
    .filter((l) => nomeCasa(l.de) === de && !l.poder)
    .map((l) => nomeCasa(l.para))
    .sort();

describe("cartas personalizadas", () => {
  it("monta a descrição a partir do modelo", () => {
    expect(descreverModelo({ modelo: "anda-como", peca: "bispo", jeito: "torre" })).toBe(
      "Seus bispos também podem andar em linha reta, como a torre.",
    );
  });

  it("anda-como: o bispo também anda como torre", () => {
    const e = comCarta(
      { id: "minha-1", nome: "Bispo torto", peso: 3, modelo: "anda-como", peca: "bispo", jeito: "torre" },
      "4k3/8/8/8/3B4/8/8/4K3 w - - 0 1",
    );
    expect(destinos(e, "d4")).toHaveLength(13 + 14);
  });

  it("imune-a-peao: peão não captura a peça escolhida", () => {
    const e = comCarta(
      { id: "minha-2", nome: "Cavalo blindado", peso: 2, modelo: "imune-a-peao", peca: "cavalo" },
      "4k3/8/8/3p4/4N3/8/8/4K3 b - - 0 1",
    );
    expect(destinos(e, "d5")).toEqual(["d4"]);
  });

  it("nao-captura, parada e alcance tiram lances", () => {
    const naoCaptura = comCarta(
      { id: "minha-3", nome: "Torre mansa", peso: 3, modelo: "nao-captura", peca: "torre" },
      "4k3/8/8/8/8/8/p7/R3K3 w - - 0 1",
    );
    expect(destinos(naoCaptura, "a1")).not.toContain("a2");

    const parada = comCarta({ id: "minha-4", nome: "Cavalos dormindo", peso: 2, modelo: "parada", peca: "cavalo", lances: 3 });
    expect(destinos(parada, "g1")).toEqual([]);

    const alcance = comCarta(
      { id: "minha-5", nome: "Dama cansada", peso: 3, modelo: "alcance", peca: "dama", casas: 2 },
      "4k3/8/8/8/8/8/8/Q3K3 w - - 0 1",
    );
    expect(destinos(alcance, "a1")).toEqual(["a2", "a3", "b1", "b2", "c1", "c3"]);
  });

  it("perde-sem: perde ao ficar sem a peça", () => {
    const e = comCarta(
      { id: "minha-6", nome: "Apego ao cavalo", peso: 3, modelo: "perde-sem", peca: "cavalo" },
      "4k3/8/8/3p4/4N3/8/8/4K3 b - - 0 1",
    );
    expect(jogar(e, "d5", "e4").resultado).toEqual({ vencedor: "pretas", motivo: "carta", cartaId: "minha-6" });
  });
});
