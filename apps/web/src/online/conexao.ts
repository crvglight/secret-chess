// Conexão com o servidor das partidas online (Socket.IO).
import { io, type Socket } from "socket.io-client";
import type { ConfigSala, EventosDoCliente, EventosDoServidor, RespostaSala } from "@xadrez/engine";

export type SocketDoJogo = Socket<EventosDoServidor, EventosDoCliente>;

/**
 * Endereço do servidor: VITE_SERVIDOR (no build publicado) ou a mesma máquina na porta 3001.
 * Usar o hostname da página faz o celular na mesma rede Wi-Fi achar o servidor do computador.
 */
export const ENDERECO_SERVIDOR =
  (import.meta.env.VITE_SERVIDOR as string | undefined) ?? `${location.protocol}//${location.hostname}:3001`;

/**
 * O online só existe com um servidor: no desenvolvimento (pnpm dev) ou quando o build
 * publicado recebe VITE_SERVIDOR. Sem isso, o jogo esconde a opção em vez de dar erro.
 */
export const ONLINE_DISPONIVEL = import.meta.env.DEV || !!import.meta.env.VITE_SERVIDOR;

let socket: SocketDoJogo | null = null;

export function conexao(): SocketDoJogo {
  socket ??= io(ENDERECO_SERVIDOR, { transports: ["websocket", "polling"] });
  return socket;
}

const chaveToken = (codigo: string) => `xadrez-sala-${codigo}`;

export function lerToken(codigo: string): string | undefined {
  try {
    return localStorage.getItem(chaveToken(codigo)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Esquece a vaga de jogador desta sala (ex.: virou espectador). */
export function esquecerToken(codigo: string): void {
  try {
    localStorage.removeItem(chaveToken(codigo));
  } catch {
    // Sem localStorage: nada guardado.
  }
}

export function guardarToken(codigo: string, token: string): void {
  try {
    localStorage.setItem(chaveToken(codigo), token);
  } catch {
    // Sem localStorage: a reconexão só funciona enquanto a aba estiver aberta.
  }
}

export function lerApelido(): string {
  try {
    return localStorage.getItem("xadrez-apelido") || "Jogador";
  } catch {
    return "Jogador";
  }
}

/** Cria a sala e devolve o código (o token fica guardado para reconectar). */
export function criarSala(config: ConfigSala): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const s = conexao();
    const tempo = setTimeout(() => rejeitar(new Error("O servidor não respondeu. Ele está rodando?")), 8000);
    s.emit("criarSala", { apelido: lerApelido(), config }, (r: RespostaSala) => {
      clearTimeout(tempo);
      if (!r.ok) return rejeitar(new Error(r.erro));
      guardarToken(r.codigo, r.token);
      resolver(r.codigo);
    });
  });
}
