import { describe, expect, it } from "vitest";
import { aplicarLance, casaDoNome as c, criarPartida, FEN_INICIAL } from "./index.ts";
import { fenParaStockfish, lanceDoUci } from "./stockfish.ts";

describe("ponte com o Stockfish", () => {
  it("monta o FEN da posição inicial e depois de um lance", () => {
    const inicio = criarPartida();
    expect(fenParaStockfish(inicio)).toBe(FEN_INICIAL);
    const depois = aplicarLance(inicio, { de: c("e2"), para: c("e4") });
    expect(fenParaStockfish(depois)).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
  });

  it("recusa posições que o xadrez normal não aceita", () => {
    expect(fenParaStockfish(criarPartida({ fen: "4k3/8/8/8/8/8/8/P3K3 w - - 0 1" }))).toBeNull();
    // As pretas jogam, mas o rei branco está atacado.
    expect(fenParaStockfish(criarPartida({ fen: "4k3/8/8/8/8/8/4r3/4K3 b - - 0 1" }))).toBeNull();
  });

  it("só dá roque com rei e torre nas casas de origem", () => {
    const fen = fenParaStockfish(criarPartida({ fen: "r3k3/8/8/8/8/8/8/4K2R w KQkq - 0 1" }));
    expect(fen).toBe("r3k3/8/8/8/8/8/8/4K2R w Kq - 0 1");
  });

  it("traduz lances UCI (incluindo roque e promoção) e recusa os proibidos", () => {
    const roque = criarPartida({ fen: "4k3/8/8/8/8/8/8/4K2R w K - 0 1" });
    expect(lanceDoUci(roque, "e1g1")).toMatchObject({ especial: "roque-curto" });
    const promo = criarPartida({ fen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1" });
    expect(lanceDoUci(promo, "a7a8n")).toMatchObject({ promocao: "cavalo" });
    expect(lanceDoUci(criarPartida(), "e2e5")).toBeNull();
    // Desvantagem Sem recuo: o lance para trás não vale, mesmo que o Stockfish queira.
    const semRecuo = criarPartida({
      fen: "4k3/8/8/R7/8/8/8/4K3 w - - 0 1",
      cartas: { brancas: { poder: null, desvantagem: "sem-recuo" } },
    });
    expect(lanceDoUci(semRecuo, "a5a1")).toBeNull();
    expect(lanceDoUci(semRecuo, "a5a8")).not.toBeNull();
  });
});
