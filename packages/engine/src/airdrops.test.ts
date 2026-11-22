import { describe, expect, it } from "vitest";
import {
  abrirCaixas,
  aplicarLance,
  casaDoNome as c,
  cartasAbertas,
  criarPartida,
  INTERVALO_AIRDROP,
  jogar,
  lancesLegais,
  nomeCasa,
  PRIMEIRO_AIRDROP,
  proximoAirdrop,
  type Estado,
  type PremioAirdrop,
} from "./index.ts";

/** Partida com airdrops e uma caixa já posta em `casa`. */
function comCaixa(fen: string, casa: string, opcoes: Parameters<typeof criarPartida>[0] = {}): Estado {
  const e = criarPartida({ ...opcoes, fen, airdrops: {} });
  return { ...e, airdrops: { ...e.airdrops!, caixas: [{ casa: c(casa), raridade: "comum", ate: 999 }] } };
}

/** Força o prêmio: procura uma semente que dê o prêmio pedido ao abrir a caixa com aquele lance. */
function comPremio(e: Estado, de: string, para: string, premio: PremioAirdrop): Estado {
  const raridade = (["lance-extra", "promocao", "cavalo", "bispo", "poder-em-dobro"] as string[]).includes(premio)
    ? "rara"
    : (["dama", "torre", "sem-desvantagem"] as string[]).includes(premio)
      ? "lendaria"
      : "comum";
  const caixas = e.airdrops!.caixas.map((x) => ({ ...x, raridade: raridade as "comum" }));
  for (let semente = 0; semente < 20000; semente++) {
    const teste = { ...e, airdrops: { ...e.airdrops!, caixas, semente } };
    const depois = jogar(teste, de, para);
    if (depois.airdrops!.registro.at(-1)?.premio === premio) return teste;
  }
  throw new Error(`Nenhuma semente deu ${premio}`);
}

describe("Airdrops", () => {
  it("a primeira caixa cai no meio do tabuleiro e depois a cada intervalo", () => {
    let e = criarPartida({ airdrops: {} });
    expect(proximoAirdrop(e)).toBe(PRIMEIRO_AIRDROP);
    for (const [de, para] of [["g1", "f3"], ["g8", "f6"], ["f3", "g1"], ["f6", "g8"]]) e = jogar(e, de!, para!);
    expect(e.airdrops!.caixas).toHaveLength(1);
    const [caixa] = e.airdrops!.caixas;
    expect(Number(nomeCasa(caixa!.casa)[1])).toBeGreaterThanOrEqual(3);
    expect(Number(nomeCasa(caixa!.casa)[1])).toBeLessThanOrEqual(6);
    expect(proximoAirdrop(e)).toBe(INTERVALO_AIRDROP);
  });

  it("a peça que para na caixa a abre (o rei não abre)", () => {
    const e = comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5");
    const d = jogar(e, "a1", "a5");
    expect(d.airdrops!.caixas).toHaveLength(0);
    expect(d.airdrops!.registro).toHaveLength(1);
    const r = comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "d2");
    expect(jogar(r, "e1", "d2").airdrops!.caixas).toHaveLength(1);
  });

  it("o mesmo lance abre sempre a mesma recompensa (replay e online iguais)", () => {
    const e = comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5");
    expect(jogar(e, "a1", "a5").airdrops!.registro[0]).toEqual(jogar(e, "a1", "a5").airdrops!.registro[0]);
  });

  it("peça extra aparece ao lado da caixa", () => {
    const e = comPremio(comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5"), "a1", "a5", "peao");
    const d = jogar(e, "a1", "a5");
    const peoes = d.tabuleiro.filter((p) => p?.tipo === "peao" && p.cor === "brancas");
    expect(peoes).toHaveLength(1);
  });

  it("escudo: a peça não pode ser capturada por 2 rodadas", () => {
    const e = comPremio(comCaixa("r3k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5"), "a1", "a5", "escudo");
    const d = jogar(e, "a1", "a5");
    expect(lancesLegais(d).some((l) => nomeCasa(l.de) === "a8" && nomeCasa(l.para) === "a5")).toBe(false);
  });

  it("espiar: quem abriu vê as cartas do adversário", () => {
    const e = comPremio(comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5"), "a1", "a5", "espiar");
    const d = jogar(e, "a1", "a5");
    expect(cartasAbertas(d, "pretas")).toBe(true);
    expect(cartasAbertas(d, "brancas")).toBe(false);
  });

  it("lance extra: quem abriu joga de novo", () => {
    const e = comPremio(comCaixa("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a5"), "a1", "a5", "lance-extra");
    expect(jogar(e, "a1", "a5").vez).toBe("brancas");
  });

  it("sem desvantagem: a desvantagem fica desligada", () => {
    const base = comCaixa("4k3/8/8/8/8/8/7P/R3K3 w - - 0 1", "a5", { cartas: { brancas: { poder: null, desvantagem: "sem-recuo" } } });
    const e = comPremio(base, "a1", "a5", "sem-desvantagem");
    let d = jogar(e, "a1", "a5");
    d = jogar(d, "e8", "d8");
    // Sem recuo desligado: a torre pode voltar.
    expect(lancesLegais(d).some((l) => nomeCasa(l.de) === "a5" && nomeCasa(l.para) === "a3")).toBe(true);
  });

  it("armadilhas: bomba explode a peça; congelada não anda; presente dá peão ao adversário", () => {
    const fen = "4k3/8/8/8/8/8/8/R3K3 w - - 0 1";
    const bomba = jogar(comPremio(comCaixa(fen, "a5"), "a1", "a5", "bomba"), "a1", "a5");
    expect(bomba.tabuleiro[c("a5")]).toBeNull();
    let gelo = jogar(comPremio(comCaixa(fen, "a5"), "a1", "a5", "congelada"), "a1", "a5");
    gelo = jogar(gelo, "e8", "d8");
    expect(lancesLegais(gelo).some((l) => nomeCasa(l.de) === "a5")).toBe(false);
    const presente = jogar(comPremio(comCaixa(fen, "a5"), "a1", "a5", "presente"), "a1", "a5");
    expect(presente.tabuleiro.filter((p) => p?.tipo === "peao" && p.cor === "pretas")).toHaveLength(1);
  });

  it("abrirCaixas não faz nada sem airdrops", () => {
    const e = criarPartida();
    abrirCaixas(e, 0);
    expect(e.airdrops).toBeUndefined();
    expect(aplicarLance(e, { de: c("e2"), para: c("e4") }).airdrops).toBeUndefined();
  });
});
