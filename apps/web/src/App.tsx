import { lazy, Suspense, useEffect, useState } from "react";
import { analiseLiberada } from "./dev/liberacao.ts";
import type { ModoPartida, RegrasPartida } from "./modo.ts";
import { Inicio } from "./telas/Inicio.tsx";
import { Jogo } from "./telas/Jogo.tsx";
import { Personalizar } from "./telas/Personalizar.tsx";
import { Progresso } from "./telas/Progresso.tsx";
import { TelaOnline } from "./telas/TelaOnline.tsx";

// Janela de análise ao vivo (#analise): no `pnpm dev` e, no site publicado, só no
// navegador liberado pela chave secreta (dev/liberacao.ts). Sem ela, nem é baixada.
const JanelaAnalise = lazy(() => import("./dev/JanelaAnalise.tsx"));

// Lê a chave secreta do endereço (?chave=...) assim que o site abre, em qualquer tela.
void analiseLiberada();

/**
 * Atalhos de URL: #local ou #ia-<facil|medio|dificil>-<brancas|pretas> abrem a partida direto.
 * Dá para acrescentar as regras no fim: #local-draft, #ia-medio-brancas-draft.
 * Com ?casas=1 na URL, a partida tem casas especiais (?casas=todas põe os 16 tipos);
 * com ?airdrops=1, tem airdrops.
 */
function modoDaUrl(): ModoPartida | null {
  const modo = modoDoHash();
  if (!modo) return modo;
  const busca = new URLSearchParams(location.search);
  const casas = busca.get("casas");
  return {
    ...modo,
    ...(casas ? { casasEspeciais: casas === "todas" ? ("todas" as const) : true } : {}),
    ...(busca.get("airdrops") ? { airdrops: true } : {}),
  };
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

/** Sala online no endereço: #sala-ABCDE (jogar) ou #assistir-ABCDE (só assistir). */
function salaDaUrl(): { codigo: string; assistir: boolean } | null {
  const m = /^#(sala|assistir)-([A-Z0-9]{4,8})$/i.exec(location.hash);
  return m ? { codigo: m[2]!.toUpperCase(), assistir: m[1]!.toLowerCase() === "assistir" } : null;
}

export function App() {
  const [modo, setModo] = useState<ModoPartida | null>(modoDaUrl);
  const [sala, setSala] = useState(salaDaUrl);
  // O link da sala pode chegar com a página já aberta (ou o jogador criar uma sala).
  useEffect(() => {
    const aoMudar = () => setSala(salaDaUrl());
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);
  const [personalizando, setPersonalizando] = useState(() => location.hash === "#personalizar");
  const [vendoProgresso, setVendoProgresso] = useState(() => location.hash === "#progresso");
  const [podeAnalisar, setPodeAnalisar] = useState(false);
  useEffect(() => {
    void analiseLiberada().then(setPodeAnalisar);
  }, []);
  if (location.hash === "#analise") {
    if (!podeAnalisar) return null;
    return (
      <Suspense fallback={null}>
        <JanelaAnalise />
      </Suspense>
    );
  }
  if (sala) {
    return (
      <TelaOnline
        key={`${sala.codigo}-${sala.assistir}`}
        codigo={sala.codigo}
        assistir={sala.assistir}
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
