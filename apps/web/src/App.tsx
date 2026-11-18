import { lazy, Suspense, useEffect, useState } from "react";
import type { ModoPartida, RegrasPartida } from "./modo.ts";
import { Inicio } from "./telas/Inicio.tsx";
import { Jogo } from "./telas/Jogo.tsx";
import { Personalizar } from "./telas/Personalizar.tsx";
import { Progresso } from "./telas/Progresso.tsx";
import { TelaOnline } from "./telas/TelaOnline.tsx";

// Janela de análise ao vivo (#analise): só no modo de desenvolvimento.
// No build publicado, import.meta.env.DEV vira false e o arquivo nem é gerado.
const JanelaAnalise = import.meta.env.DEV ? lazy(() => import("./dev/JanelaAnalise.tsx")) : null;

/**
 * Atalhos de URL: #local ou #ia-<facil|medio|dificil>-<brancas|pretas> abrem a partida direto.
 * Dá para acrescentar as regras no fim: #local-draft, #ia-medio-brancas-draft.
 * Com ?casas=1 na URL, a partida tem casas especiais (?casas=todas põe os 16 tipos).
 */
function modoDaUrl(): ModoPartida | null {
  const modo = modoDoHash();
  const casas = new URLSearchParams(location.search).get("casas");
  if (!modo || !casas) return modo;
  return { ...modo, casasEspeciais: casas === "todas" ? "todas" : true };
}

function modoDoHash(): ModoPartida | null {
  const local = /^#local(?:-(padrao|draft|mao|caos))?$/.exec(location.hash);
  if (local) return { tipo: "local", regras: (local[1] ?? "padrao") as RegrasPartida };
  const ia = /^#ia-(facil|medio|dificil)-(brancas|pretas)(?:-(padrao|draft|mao|caos))?$/.exec(location.hash);
  if (ia) {
    return {
      tipo: "ia",
      nivel: ia[1] as "facil",
      corHumano: ia[2] as "brancas",
      regras: (ia[3] ?? "padrao") as RegrasPartida,
    };
  }
  return null;
}

/** Código da sala online no endereço (#sala-ABCDE), ou null. */
const salaDaUrl = () => /^#sala-([A-Z0-9]{4,8})$/i.exec(location.hash)?.[1]?.toUpperCase() ?? null;

export function App() {
  const [modo, setModo] = useState<ModoPartida | null>(modoDaUrl);
  const [sala, setSala] = useState<string | null>(salaDaUrl);
  // O link da sala pode chegar com a página já aberta (ou o jogador criar uma sala).
  useEffect(() => {
    const aoMudar = () => setSala(salaDaUrl());
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);
  const [personalizando, setPersonalizando] = useState(() => location.hash === "#personalizar");
  const [vendoProgresso, setVendoProgresso] = useState(() => location.hash === "#progresso");
  if (JanelaAnalise && location.hash === "#analise") {
    return (
      <Suspense fallback={null}>
        <JanelaAnalise />
      </Suspense>
    );
  }
  if (sala) {
    return (
      <TelaOnline
        codigo={sala}
        aoSair={() => {
          history.replaceState(null, "", location.pathname + location.search);
          setSala(null);
        }}
      />
    );
  }
  if (modo) return <Jogo modo={modo} aoSair={() => setModo(null)} />;
  if (personalizando) return <Personalizar aoVoltar={() => setPersonalizando(false)} />;
  if (vendoProgresso) return <Progresso aoVoltar={() => setVendoProgresso(false)} />;
  return (
    <Inicio
      aoJogar={setModo}
      aoPersonalizar={() => setPersonalizando(true)}
      aoVerProgresso={() => setVendoProgresso(true)}
    />
  );
}
