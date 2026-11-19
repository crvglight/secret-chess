// Conversa com o Stockfish (public/stockfish, GPL v3) pelo protocolo UCI, num Web Worker.
// O arquivo de ~7 MB só é baixado quando alguém joga contra o Stockfish.

/** Força escolhida no menu (1 = iniciante, 8 = quase o máximo). */
export const FORCAS_STOCKFISH = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const FORCA_PADRAO = 4;

/** Para cada força: o "Skill Level" do Stockfish (0–20) e o tempo para pensar. */
const CONFIG_FORCA: Record<number, { habilidade: number; tempoMs: number }> = {
  1: { habilidade: 0, tempoMs: 150 },
  2: { habilidade: 3, tempoMs: 250 },
  3: { habilidade: 6, tempoMs: 400 },
  4: { habilidade: 9, tempoMs: 600 },
  5: { habilidade: 12, tempoMs: 800 },
  6: { habilidade: 15, tempoMs: 1000 },
  7: { habilidade: 18, tempoMs: 1300 },
  8: { habilidade: 20, tempoMs: 1600 },
};

/** Quantas linhas pedir: se o melhor lance for proibido por uma carta, tenta os seguintes. */
const LINHAS = 5;
/** Tempo extra para o primeiro carregamento (baixar e iniciar o motor). */
const FOLGA_CARREGAR_MS = 30_000;

export interface PensamentoStockfish {
  /** O lance escolhido pelo Stockfish (já com a fraqueza da força aplicada). */
  melhor: string;
  /** O primeiro lance de cada linha, da melhor para a pior. */
  alternativas: string[];
}

const ARQUIVO = `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`;

class MotorStockfish {
  private worker: Worker | null = null;
  private pronto: Promise<void> | null = null;
  /** Os pedidos vão um de cada vez. */
  private fila: Promise<unknown> = Promise.resolve();

  /** Baixa e inicia o motor (pode chamar antes, para a primeira jogada não demorar). */
  iniciar(): Promise<void> {
    if (this.pronto) return this.pronto;
    const worker = new Worker(ARQUIVO);
    this.worker = worker;
    this.pronto = new Promise<void>((resolver, rejeitar) => {
      const tempo = setTimeout(() => rejeitar(new Error("O Stockfish demorou demais para carregar")), FOLGA_CARREGAR_MS);
      const ouvir = (ev: MessageEvent) => {
        if (ev.data === "uciok") worker.postMessage("isready");
        if (ev.data === "readyok") {
          clearTimeout(tempo);
          worker.removeEventListener("message", ouvir);
          resolver();
        }
      };
      worker.addEventListener("message", ouvir);
      worker.addEventListener("error", () => {
        clearTimeout(tempo);
        rejeitar(new Error("O Stockfish não carregou"));
      });
      worker.postMessage("uci");
    }).catch((erro: unknown) => {
      this.encerrar();
      throw erro;
    });
    return this.pronto;
  }

  /** Pede o lance para a posição (FEN) na força escolhida. */
  pensar(fen: string, forca: number): Promise<PensamentoStockfish> {
    const tarefa = this.fila.then(() => this.pensarAgora(fen, forca));
    this.fila = tarefa.catch(() => undefined);
    return tarefa;
  }

  private async pensarAgora(fen: string, forca: number): Promise<PensamentoStockfish> {
    await this.iniciar();
    const worker = this.worker!;
    const { habilidade, tempoMs } = CONFIG_FORCA[forca] ?? CONFIG_FORCA[FORCA_PADRAO]!;
    return new Promise<PensamentoStockfish>((resolver, rejeitar) => {
      const linhas = new Map<number, string>();
      const tempo = setTimeout(() => {
        // Recomeça o motor do zero (a busca antiga não pode responder ao próximo pedido).
        this.encerrar();
        rejeitar(new Error("O Stockfish não respondeu"));
      }, tempoMs + 10_000);
      function ouvir(ev: MessageEvent) {
        const texto = typeof ev.data === "string" ? ev.data : "";
        if (texto.startsWith("info ")) {
          const m = / multipv (\d+) .*? pv (\S+)/.exec(texto);
          if (m) linhas.set(Number(m[1]), m[2]!);
          return;
        }
        if (!texto.startsWith("bestmove")) return;
        clearTimeout(tempo);
        worker.removeEventListener("message", ouvir);
        const melhor = texto.split(/\s+/)[1] ?? "";
        const alternativas = [...linhas.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
        if (melhor === "(none)" || !melhor) rejeitar(new Error("O Stockfish não achou lance"));
        else resolver({ melhor, alternativas });
      }
      worker.addEventListener("message", ouvir);
      worker.postMessage(`setoption name Skill Level value ${habilidade}`);
      worker.postMessage(`setoption name MultiPV value ${LINHAS}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${tempoMs}`);
    });
  }

  encerrar(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pronto = null;
  }
}

/** Um motor só para o site inteiro (carregar o arquivo de 7 MB uma vez). */
export const stockfish = new MotorStockfish();
