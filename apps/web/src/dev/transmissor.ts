// Roda na aba do jogo (só no modo de desenvolvimento): manda a posição para a
// janela de análise e abre essa janela com Alt+A.
import { NOME_CANAL, NOME_JANELA, type DadosPartida, type MensagemCanal } from "./canal.ts";

function abrirJanela(): void {
  const url = `${location.pathname}#analise`;
  // Reaproveita a janela se ela já estiver aberta (em outro monitor, por exemplo).
  const janela = window.open("", NOME_JANELA, "popup,width=820,height=960");
  if (!janela) return;
  if (!janela.location.hash.includes("analise")) janela.location.href = url;
  janela.focus();
}

export function iniciarTransmissor(atual: () => DadosPartida): { publicar(): void; parar(): void } {
  const canal = new BroadcastChannel(NOME_CANAL);
  const publicar = () => canal.postMessage({ tipo: "estado", ...atual() } satisfies MensagemCanal);

  // A janela de análise pede a posição quando abre.
  canal.onmessage = (ev: MessageEvent<MensagemCanal>) => {
    if (ev.data.tipo === "pedir") publicar();
  };

  const aoTeclar = (ev: KeyboardEvent) => {
    if (!ev.altKey || ev.key.toLowerCase() !== "a") return;
    ev.preventDefault();
    abrirJanela();
  };
  window.addEventListener("keydown", aoTeclar);
  publicar();

  return {
    publicar,
    parar() {
      window.removeEventListener("keydown", aoTeclar);
      canal.close();
    },
  };
}
