import { describe, expect, it } from "vitest";
import { aleatorioComSemente, casaDoNome as c, type ConfigSala, type Estado } from "@xadrez/engine";
import { Sala } from "./sala.ts";

const CONFIG: ConfigSala = { regras: "padrao", casasEspeciais: false, minutos: null, cor: "brancas" };

/** Sala com relógio falso (avança só quando o teste manda). */
function novaSala(config: Partial<ConfigSala> = {}) {
  let agora = 1_000_000;
  const sala = new Sala("TESTE", { ...CONFIG, ...config }, () => agora, aleatorioComSemente(4));
  return { sala, passar: (ms: number) => (agora += ms) };
}

const lance = (de: string, para: string) => ({ tipo: "lance" as const, lance: { de: c(de), para: c(para) } });

describe("Sala online", () => {
  it("o segundo jogador entra na outra cor e a partida começa", () => {
    const { sala } = novaSala();
    const a = sala.entrar("Ana");
    const b = sala.entrar("Bia");
    expect(a).toMatchObject({ ok: true, cor: "brancas" });
    expect(b).toMatchObject({ ok: true, cor: "pretas" });
    expect(sala.fase).toBe("jogando");
    expect(sala.entrar("Caio")).toMatchObject({ ok: false });
  });

  it("reconecta na mesma cor com o token", () => {
    const { sala } = novaSala();
    const a = sala.entrar("Ana");
    sala.entrar("Bia");
    sala.desconectar("brancas");
    expect(sala.vista("pretas").jogadores.brancas?.conectado).toBe(false);
    const de_novo = sala.entrar("Ana", a.ok ? a.token : "");
    expect(de_novo).toMatchObject({ ok: true, cor: "brancas" });
    expect(sala.vista("pretas").jogadores.brancas?.conectado).toBe(true);
  });

  it("valida a vez e os lances; o lance válido muda o estado", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    expect(sala.agir("pretas", lance("e7", "e5"))).toContain("vez");
    expect(sala.agir("brancas", lance("e2", "e5"))).toBeTruthy();
    expect(sala.agir("brancas", lance("e2", "e4"))).toBeNull();
    expect(sala.estado!.vez).toBe("pretas");
  });

  it("cada jogador só vê as próprias cartas", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    const real = sala.estado!;
    const vista = sala.vista("brancas").estado as Estado;
    expect(vista.cartas.brancas).toEqual(real.cartas.brancas);
    if (real.cartas.pretas.desvantagem !== "espiao") {
      expect(vista.cartas.pretas).toEqual({ poder: null, desvantagem: null });
    }
  });

  it("no fim, a vista mostra tudo e traz o inicial e as ações para o replay", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    sala.agir("brancas", lance("e2", "e4"));
    sala.desistir("pretas");
    const vista = sala.vista("brancas");
    expect(vista.fase).toBe("fim");
    expect(vista.estado!.resultado).toEqual({ vencedor: "brancas", motivo: "desistencia" });
    expect(vista.estado!.cartas.pretas).toEqual(sala.estado!.cartas.pretas);
    expect(vista.final!.acoes).toHaveLength(1);
  });

  it("relógio: desconta só de quem joga e encerra quando o tempo acaba", () => {
    const { sala, passar } = novaSala({ minutos: 3 });
    sala.entrar("Ana");
    sala.entrar("Bia");
    const inicioBrancas = sala.tempoDe("brancas");
    passar(10_000);
    sala.agir("brancas", lance("e2", "e4"));
    expect(sala.tempoDe("brancas")).toBe(inicioBrancas - 10_000);
    passar(5_000);
    expect(sala.tempoDe("brancas")).toBe(inicioBrancas - 10_000);
    passar(sala.tempoDe("pretas"));
    expect(sala.verificarTempo()).toBe(true);
    expect(sala.estado!.resultado).toEqual({ vencedor: "brancas", motivo: "tempo" });
  });

  it("abandono: quem não volta perde", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    sala.desconectar("pretas");
    sala.abandonar("pretas");
    expect(sala.estado!.resultado).toEqual({ vencedor: "brancas", motivo: "abandono" });
  });

  it("draft: cada um escolhe da própria oferta e então a partida começa", () => {
    const { sala } = novaSala({ regras: "draft" });
    sala.entrar("Ana");
    sala.entrar("Bia");
    expect(sala.fase).toBe("draft");
    const ofertaB = sala.vista("brancas").oferta!;
    const ofertaP = sala.vista("pretas").oferta!;
    expect(sala.escolherDraft("brancas", { poder: ofertaP.poderes[0]!, desvantagem: ofertaB.desvantagens[0]! })).toBeTruthy();
    expect(sala.escolherDraft("brancas", { poder: ofertaB.poderes[0]!, desvantagem: ofertaB.desvantagens[0]! })).toBeNull();
    expect(sala.fase).toBe("draft");
    sala.escolherDraft("pretas", { poder: ofertaP.poderes[1]!, desvantagem: ofertaP.desvantagens[2]! });
    expect(sala.fase).toBe("jogando");
    expect(sala.estado!.cartas.brancas.poder).toBe(ofertaB.poderes[0]);
  });

  it("revanche: com os dois pedindo, começa outra partida com as cores trocadas", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    sala.desistir("brancas");
    sala.pedirRevanche("brancas");
    expect(sala.fase).toBe("fim");
    sala.pedirRevanche("pretas");
    expect(sala.fase).toBe("jogando");
    expect(sala.jogadores.brancas?.apelido).toBe("Bia");
  });

  it("segredos não vazam: a armadilha das brancas não aparece para as pretas", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    // Força as cartas para o teste: brancas com Armadilha.
    sala.estado = { ...sala.estado!, cartas: { brancas: { poder: "armadilha", desvantagem: null }, pretas: { poder: null, desvantagem: null } }, usosPoder: { brancas: 1, pretas: 0 }, dadosCartas: { brancas: { poder: { casa: null }, desvantagem: {} }, pretas: { poder: {}, desvantagem: {} } } };
    expect(sala.agir("brancas", { tipo: "poder", alvo: c("e5") })).toBeNull();
    const dasPretas = sala.vista("pretas");
    expect(dasPretas.destaques.some((d) => d.casa === c("e5"))).toBe(false);
    expect(dasPretas.estado!.eventos).toEqual([]);
    expect(dasPretas.estado!.cartas.brancas).toEqual({ poder: null, desvantagem: null });
    // Já as brancas veem a própria armadilha.
    expect(sala.vista("brancas").destaques.some((d) => d.casa === c("e5"))).toBe(true);
  });

  it("espectador não vê os segredos de nenhum lado (só no fim)", () => {
    const { sala } = novaSala({ regras: "mao" });
    sala.entrar("Ana");
    sala.entrar("Bia");
    sala.espectadores = 1;
    const vista = sala.vista("brancas", true);
    expect(vista).toMatchObject({ espectador: true, espectadores: 1, minhaCor: "brancas", oferta: null });
    for (const cor of ["brancas", "pretas"] as const) {
      expect(vista.estado!.cartas[cor].poder).toBeNull();
      expect(vista.estado!.cartas[cor].desvantagem).toBeNull();
      expect(vista.estado!.mao!.mao[cor].every((id) => id === "oculta")).toBe(true);
      expect(vista.estado!.mao!.baralho[cor]).toEqual([]);
    }
    // O jogador continua vendo as próprias cartas.
    expect(sala.vista("brancas").estado!.cartas.brancas.desvantagem).not.toBeNull();
    sala.desistir("brancas");
    expect(sala.vista("brancas", true).estado!.cartas.pretas.desvantagem).not.toBeNull();
  });

  it("lance barrado por carta escondida: a recusa não diz qual é a carta", () => {
    const { sala } = novaSala();
    sala.entrar("Ana");
    sala.entrar("Bia");
    // Pretas com Escudo (as brancas não sabem).
    sala.estado = {
      ...sala.estado!,
      cartas: { brancas: { poder: null, desvantagem: null }, pretas: { poder: "escudo", desvantagem: null } },
      usosPoder: { brancas: 0, pretas: 1 },
      dadosCartas: { brancas: { poder: {}, desvantagem: {} }, pretas: { poder: { pecaId: null }, desvantagem: {} } },
    };
    sala.agir("brancas", lance("d2", "d4"));
    expect(sala.agir("pretas", { tipo: "poder", alvo: c("e7") })).toBeNull();
    sala.agir("pretas", lance("e7", "e5"));
    expect(sala.agir("brancas", lance("d4", "e5"))).toBe("Uma carta do adversário impede este lance.");
  });
});
