import { describe, expect, it } from "vitest";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { cartasDoDraft, escolhaDraftIA, OPCOES_NO_DRAFT, rerolarOferta, sortearDraft } from "./draft.ts";
import { aleatorioComSemente } from "./sorteio.ts";


describe("Draft", () => {
  it("cada lado recebe 3 poderes e 3 desvantagens, cartas diferentes e ofertas equilibradas", () => {
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
      // A soma dos pesos das ofertas dos dois lados difere no máximo 1 ponto.
      const soma = (ids: string[]) => ids.reduce((t, id) => t + obterCarta(id).peso, 0);
      expect(Math.abs(soma(brancas.poderes) - soma(pretas.poderes))).toBeLessThanOrEqual(1);
      expect(Math.abs(soma(brancas.desvantagens) - soma(pretas.desvantagens))).toBeLessThanOrEqual(1);
    }
  });

  it("o sorteio varia: todas as cartas aparecem, e as de peso maior saem só um pouco menos", () => {
    const rng = aleatorioComSemente(77);
    const vezes = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      const { brancas, pretas } = sortearDraft(rng);
      for (const id of [...brancas.poderes, ...pretas.poderes, ...brancas.desvantagens, ...pretas.desvantagens]) {
        vezes.set(id, (vezes.get(id) ?? 0) + 1);
      }
    }
    const doDraft = CARTAS_OFICIAIS.filter((c) => !c.foraDoDraft && !c.exigeRelogio);
    for (const c of doDraft) expect(vezes.get(c.id) ?? 0, c.id).toBeGreaterThan(0);
    // Diferença leve: nenhuma carta sai mais que ~2,2x outra.
    const contagens = doDraft.map((c) => vezes.get(c.id) ?? 0);
    expect(Math.max(...contagens) / Math.min(...contagens)).toBeLessThan(2.2);
  });

  it("Wallhack e Damas nunca aparecem no Draft", () => {
    const rng = aleatorioComSemente(3);
    for (let i = 0; i < 500; i++) {
      const { brancas, pretas } = sortearDraft(rng);
      const todas = [...brancas.poderes, ...pretas.poderes, ...brancas.desvantagens, ...pretas.desvantagens];
      expect(todas).not.toContain("wallhack");
      expect(todas).not.toContain("capturas-obrigatorias");
    }
  });

  it("Spyware no Draft: quem escolhe fica sem poder e o adversário ganha uma desvantagem extra", () => {
    const cartas = cartasDoDraft(
      { brancas: { poder: "spyware", desvantagem: "prazo" }, pretas: { poder: "sniper", desvantagem: "sem-roque" } },
      aleatorioComSemente(1),
    );
    expect(cartas.brancas.poder).toBeNull();
    expect(cartas.pretas.desvantagem).toBe("prazo");
    expect(cartas.pretas.extra).toBeTruthy();
    expect(cartas.pretas.extra).not.toBe("prazo");
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

  it("o re-roll troca todas as cartas, nunca repete as de antes (nem as do adversário)", () => {
    const rng = aleatorioComSemente(5);
    for (let i = 0; i < 200; i++) {
      const { brancas, pretas } = sortearDraft(rng);
      const ocupadas = new Set([...brancas.poderes, ...brancas.desvantagens, ...pretas.poderes, ...pretas.desvantagens]);
      const nova = rerolarOferta(brancas, rng, undefined, false, ocupadas);
      // Nenhuma carta da oferta anterior volta.
      for (const id of [...nova.poderes, ...nova.desvantagens]) {
        expect([...brancas.poderes, ...brancas.desvantagens]).not.toContain(id);
      }
      const todas = [...nova.poderes, ...nova.desvantagens];
      expect(new Set(todas).size).toBe(todas.length);
      // Nada da oferta das pretas aparece; quase sempre tudo muda.
      for (const id of todas) expect([...pretas.poderes, ...pretas.desvantagens]).not.toContain(id);
    }
  });
});
