// Sons do jogo, gerados na hora pelo Web Audio (sem arquivos de áudio).
// Cada som é um "toque" curto de madeira (ruído filtrado + uma nota grave), no estilo
// dos sites de xadrez: um para o seu lance, outro para a vez de você jogar, captura,
// peça perdida, xeque e fim de partida.

export type Som = "meu-lance" | "sua-vez" | "captura" | "capturado" | "xeque" | "fim" | "poder";

let contexto: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  contexto ??= new AudioContext();
  // O navegador só libera o som depois de um clique/toque na página.
  if (contexto.state === "suspended") void contexto.resume().catch(() => undefined);
  return contexto;
}

// Desbloqueia o áudio no primeiro clique (assim o lance do adversário online já toca).
if (typeof window !== "undefined") {
  const liberar = () => {
    audio();
    window.removeEventListener("pointerdown", liberar);
    window.removeEventListener("keydown", liberar);
  };
  window.addEventListener("pointerdown", liberar);
  window.addEventListener("keydown", liberar);
}

/** Batida de madeira: ruído curto passando por um filtro, com volume caindo rápido. */
function batida(ac: AudioContext, inicio: number, freq: number, volume: number, duracao = 0.09): void {
  const tamanho = Math.ceil(ac.sampleRate * duracao);
  const buffer = ac.createBuffer(1, tamanho, ac.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < tamanho; i++) dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tamanho, 4);
  const fonte = ac.createBufferSource();
  fonte.buffer = buffer;
  const filtro = ac.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.frequency.value = freq;
  filtro.Q.value = 3.5;
  const ganho = ac.createGain();
  ganho.gain.value = volume;
  fonte.connect(filtro).connect(ganho).connect(ac.destination);
  fonte.start(inicio);
}

/** Nota curta (corpo do som), com ataque rápido e queda suave. */
function nota(ac: AudioContext, inicio: number, freq: number, volume: number, duracao: number, tipo: OscillatorType = "sine"): void {
  const osc = ac.createOscillator();
  osc.type = tipo;
  osc.frequency.value = freq;
  const ganho = ac.createGain();
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.008);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(ganho).connect(ac.destination);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

export function tocar(som: Som): void {
  const ac = audio();
  if (!ac || ac.state !== "running") return;
  const t = ac.currentTime + 0.01;
  switch (som) {
    case "meu-lance":
      // Toque seco e médio: a peça pousando.
      batida(ac, t, 1800, 0.9);
      nota(ac, t, 180, 0.25, 0.08);
      break;
    case "sua-vez":
      // Um pouco mais grave e mais cheio que o seu lance: o adversário jogou.
      batida(ac, t, 1200, 0.9);
      nota(ac, t, 140, 0.3, 0.1);
      break;
    case "captura":
      // Duas batidas rápidas e mais agudas: peça batendo em peça.
      batida(ac, t, 2600, 1, 0.07);
      batida(ac, t + 0.035, 1500, 0.8, 0.09);
      nota(ac, t, 220, 0.2, 0.08);
      break;
    case "capturado":
      // Batida dupla mais grave e abafada: você perdeu uma peça.
      batida(ac, t, 900, 1, 0.09);
      batida(ac, t + 0.04, 600, 0.8, 0.11);
      nota(ac, t, 110, 0.3, 0.14);
      break;
    case "xeque":
      batida(ac, t, 1600, 0.7);
      nota(ac, t, 660, 0.12, 0.12, "triangle");
      nota(ac, t + 0.09, 880, 0.12, 0.16, "triangle");
      break;
    case "poder":
      // Brilho curto subindo: carta ou poder em ação.
      nota(ac, t, 520, 0.08, 0.14, "triangle");
      nota(ac, t + 0.06, 780, 0.08, 0.14, "triangle");
      nota(ac, t + 0.12, 1040, 0.08, 0.2, "triangle");
      break;
    case "fim":
      nota(ac, t, 392, 0.12, 0.6, "triangle");
      nota(ac, t + 0.12, 494, 0.1, 0.6, "triangle");
      nota(ac, t + 0.24, 587, 0.1, 0.8, "triangle");
      break;
  }
}
