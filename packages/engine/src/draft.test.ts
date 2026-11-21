import { describe, expect, it } from "vitest";
import { obterCarta } from "./cartas/index.ts";
import { cartasDoDraft, escolhaDraftIA, OPCOES_NO_DRAFT, sortearDraft } from "./draft.ts";
import { aleatorioComSemente } from "./sorteio.ts";

const pesos = (ids: string[]) => ids.map((id) => obterCarta(id).peso).sort();

describe("Draft", () => {
  it("cada lado recebe 3 poderes e 3 desvantagens, com os mesmos pesos e cartas diferentes", () => {
    const rng = aleatorioComSemente(8);
    for (let i = 0; i < 300; i++) {
      const { brancas, pretas } = sortearDraft(rng);
      for (const lado of [brancas, pretas]) {
        expect(lado.poderes).toHaveLength(OPCOES_NO_DRAFT);
        expect(lado.desvantagens).toHaveLength(OPCOES_NO_DRAFT);
        lado.poderes.forEach((id) => expect(obterCarta(id).tipo).toBe("poder"));
        lado.desvantagens.forEach((id) => expect(obterCarta(id).tipo).toBe("desvantagem"));
      }
      const todas = [...brancas.poderes, ...pretas.poderes, ...brancas.desvantagens, ...pretas.desvantagens];
      expect(new Set(todas).size).toBe(todas.length);
      expect(pesos(brancas.poderes)).toEqual(pesos(pretas.poderes));
      expect(pesos(brancas.desvantagens)).toEqual(pesos(pretas.desvantagens));
    }
  });

  it("a IA esperta pega o poder mais forte e dá ao adversário a desvantagem mais pesada", () => {
    const oferta = {
      poderes: ["recuo-tatico", "escudo", "dama-imortal"],
      desvantagens: ["dama-fragil", "sem-roque", "prazo"],
    };
    const pesada = [...oferta.desvantagens].sort((a, b) => obterCarta(b).peso - obterCarta(a).peso)[0];
    expect(escolhaDraftIA(oferta, true)).toEqual({ poder: "dama-imortal", desvantagem: pesada });
  });

  it("cada lado fica com o próprio poder e a desvantagem que o adversário escolheu", () => {
    const cartas = cartasDoDraft({
      brancas: { poder: "escudo", desvantagem: "prazo" },
      pretas: { poder: "sniper", desvantagem: "sem-roque" },
    });
    expect(cartas).toEqual({
      brancas: { poder: "escudo", desvantagem: "sem-roque" },
      pretas: { poder: "sniper", desvantagem: "prazo" },
    });
  });

  it("a IA fácil escolhe dentro da oferta", () => {
    const rng = aleatorioComSemente(2);
    const oferta = sortearDraft(rng).brancas;
    const escolha = escolhaDraftIA(oferta, false, rng);
    expect(oferta.poderes).toContain(escolha.poder);
    expect(oferta.desvantagens).toContain(escolha.desvantagem);
  });
});
