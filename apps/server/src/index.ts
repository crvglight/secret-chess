import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  REACOES,
  VERSAO_MOTOR,
  type AcaoPartida,
  type ConfigSala,
  type EventosDoCliente,
  type EventosDoServidor,
} from "@xadrez/engine";
import { Sala } from "./sala.ts";

const PORTA = Number(process.env.PORT ?? 3001);
/** Quanto tempo quem caiu tem para voltar antes de perder por abandono. */
const TEMPO_PARA_VOLTAR_MS = 60_000;
/** Salas paradas há mais que isso são apagadas. */
const SALA_ABANDONADA_MS = 2 * 60 * 60_000;
const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const salas = new Map<string, Sala>();
const timersRelogio = new Map<string, ReturnType<typeof setTimeout>>();
const timersAbandono = new Map<string, ReturnType<typeof setTimeout>>();

const http = createServer((req, res) => {
  if (req.url === "/saude") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, motor: VERSAO_MOTOR, salas: salas.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<EventosDoCliente, EventosDoServidor>(http, { cors: { origin: "*" } });

function novoCodigo(): string {
  for (;;) {
    let c = "";
    for (let i = 0; i < 5; i++) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    if (!salas.has(c)) return c;
  }
}

/** Canal de um jogador: pelo token (não pela cor, que troca na revanche). */
const canal = (codigo: string, token: string) => `${codigo}:${token}`;
/** Canal de quem só assiste à sala. */
const canalEspectadores = (codigo: string) => `${codigo}:espectadores`;

/** Manda a cada jogador a vista dele e agenda o fim por tempo, se houver relógio. */
function enviarVistas(sala: Sala): void {
  for (const cor of ["brancas", "pretas"] as const) {
    const j = sala.jogadores[cor];
    if (j) io.to(canal(sala.codigo, j.token)).emit("sala", sala.vista(cor));
  }
  if (sala.espectadores > 0) io.to(canalEspectadores(sala.codigo)).emit("sala", sala.vista("brancas", true));
  clearTimeout(timersRelogio.get(sala.codigo));
  const prazo = sala.msAteAcabarTempo();
  if (prazo !== null && sala.fase === "jogando") {
    timersRelogio.set(
      sala.codigo,
      setTimeout(() => {
        if (sala.verificarTempo()) enviarVistas(sala);
      }, prazo + 50),
    );
  }
}

// ---------------------------------------------------------------------------
// Validação do que chega do navegador (nunca confiar no cliente)
// ---------------------------------------------------------------------------

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const casaValida = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 64;

function configValida(v: unknown): ConfigSala | null {
  const c = v as Partial<ConfigSala> | null;
  if (!c || typeof c !== "object") return null;
  if (!["padrao", "draft", "mao", "caos"].includes(c.regras as string)) return null;
  if (![3, 5, 10, null].includes(c.minutos as number | null)) return null;
  if (!["brancas", "pretas", "aleatoria"].includes(c.cor as string)) return null;
  return { regras: c.regras!, minutos: c.minutos!, cor: c.cor!, casasEspeciais: c.casasEspeciais === true };
}

function acaoValida(v: unknown): AcaoPartida | null {
  const a = v as Record<string, unknown> | null;
  if (!a || typeof a !== "object") return null;
  if (a.tipo === "carta" && Number.isInteger(a.indice)) return { tipo: "carta", indice: a.indice as number };
  if (a.tipo === "poder" && (a.alvo === null || casaValida(a.alvo))) return { tipo: "poder", alvo: a.alvo as number | null };
  const l = a.lance as Record<string, unknown> | undefined;
  if (a.tipo === "lance" && l && casaValida(l.de) && casaValida(l.para)) {
    return {
      tipo: "lance",
      lance: {
        de: l.de,
        para: l.para,
        ...(typeof l.promocao === "string" ? { promocao: l.promocao as never } : {}),
        ...(typeof l.poder === "string" ? { poder: l.poder } : {}),
      },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------

io.on("connection", (socket: Socket<EventosDoCliente, EventosDoServidor>) => {
  /** A sala e o token deste navegador, depois que ele entra. A cor é consultada na hora. */
  let atual: { sala: Sala; token: string } | null = null;
  /** A sala que este navegador está assistindo (não joga nela). */
  let assistindo: Sala | null = null;
  const minhaCor = () => (atual ? atual.sala.corDe(atual.token) : null);

  function vincular(sala: Sala, token: string) {
    atual = { sala, token };
    const chave = canal(sala.codigo, token);
    void socket.join(chave);
    clearTimeout(timersAbandono.get(chave));
    timersAbandono.delete(chave);
  }

  socket.on("criarSala", (dados, responder) => {
    const config = configValida(dados?.config);
    if (!config || typeof responder !== "function") return responder?.({ ok: false, erro: "Configuração inválida." });
    const sala = new Sala(novoCodigo(), config);
    salas.set(sala.codigo, sala);
    const r = sala.entrar(texto(dados.apelido, 20));
    if (!r.ok) return responder(r);
    vincular(sala, r.token);
    responder({ ok: true, codigo: sala.codigo, token: r.token, cor: r.cor });
    enviarVistas(sala);
  });

  socket.on("entrarSala", (dados, responder) => {
    if (typeof responder !== "function") return;
    const sala = salas.get(texto(dados?.codigo, 8).toUpperCase());
    if (!sala) return responder({ ok: false, erro: "Sala não encontrada. Confira o link." });
    const r = sala.entrar(texto(dados.apelido, 20), texto(dados.token, 64) || undefined);
    if (!r.ok) return responder(r);
    vincular(sala, r.token);
    responder({ ok: true, codigo: sala.codigo, token: r.token, cor: r.cor });
    enviarVistas(sala);
  });

  socket.on("assistirSala", (dados, responder) => {
    if (typeof responder !== "function" || atual || assistindo) return;
    const sala = salas.get(texto(dados?.codigo, 8).toUpperCase());
    if (!sala) return responder({ ok: false, erro: "Sala não encontrada. Confira o link." });
    assistindo = sala;
    sala.espectadores++;
    void socket.join(canalEspectadores(sala.codigo));
    responder({ ok: true, codigo: sala.codigo });
    enviarVistas(sala);
  });

  socket.on("escolherDraft", (escolha) => {
    const cor = minhaCor();
    if (!atual || !cor || !escolha || typeof escolha !== "object") return;
    const erro = atual.sala.escolherDraft(cor, {
      poder: texto(escolha.poder, 40) || null,
      desvantagem: texto(escolha.desvantagem, 40) || null,
    });
    if (erro) socket.emit("recusado", erro);
    else enviarVistas(atual.sala);
  });

  socket.on("acao", (dados) => {
    const cor = minhaCor();
    if (!atual || !cor) return;
    const acao = acaoValida(dados);
    if (!acao) return socket.emit("recusado", "Ação inválida.");
    const motivo = atual.sala.agir(cor, acao);
    if (motivo) socket.emit("recusado", motivo);
    enviarVistas(atual.sala);
  });

  socket.on("reagir", (reacao) => {
    const cor = minhaCor();
    if (!atual || !cor || !REACOES.includes(reacao)) return;
    for (const c of ["brancas", "pretas"] as const) {
      const j = atual.sala.jogadores[c];
      if (j) io.to(canal(atual.sala.codigo, j.token)).emit("reacao", { cor, reacao });
    }
    io.to(canalEspectadores(atual.sala.codigo)).emit("reacao", { cor, reacao });
  });

  socket.on("desistir", () => {
    const cor = minhaCor();
    if (!atual || !cor) return;
    atual.sala.desistir(cor);
    enviarVistas(atual.sala);
  });

  socket.on("revanche", () => {
    const cor = minhaCor();
    if (!atual || !cor) return;
    atual.sala.pedirRevanche(cor);
    enviarVistas(atual.sala);
  });

  socket.on("disconnect", async () => {
    if (assistindo) {
      assistindo.espectadores = Math.max(0, assistindo.espectadores - 1);
      enviarVistas(assistindo);
      return;
    }
    if (!atual) return;
    const { sala, token } = atual;
    const chave = canal(sala.codigo, token);
    // Outra aba do mesmo jogador ainda pode estar conectada.
    const restantes = await io.in(chave).fetchSockets();
    if (restantes.length > 0) return;
    const cor = sala.corDe(token);
    if (!cor) return;
    sala.desconectar(cor);
    enviarVistas(sala);
    timersAbandono.set(
      chave,
      setTimeout(() => {
        const corAgora = sala.corDe(token);
        if (corAgora) sala.abandonar(corAgora);
        enviarVistas(sala);
      }, TEMPO_PARA_VOLTAR_MS),
    );
  });
});

// Limpeza: salas paradas há muito tempo.
setInterval(
  () => {
    const limite = Date.now() - SALA_ABANDONADA_MS;
    for (const [codigo, sala] of salas) {
      if (sala.ultimaAtividade < limite) {
        salas.delete(codigo);
        clearTimeout(timersRelogio.get(codigo));
      }
    }
  },
  10 * 60_000,
).unref();

http.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
