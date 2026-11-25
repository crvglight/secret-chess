import { useCallback, useEffect, useState } from "react";
import type { AcaoPartida, CartasDoJogador, Cor, Digitacao, Espiada, Reacao, RespostaAssistir, RespostaSala, VistaSala } from "@xadrez/engine";
import { conexao, esquecerToken, guardarToken, lerApelido, lerToken } from "./conexao.ts";

export interface EstadoSala {
  vista: VistaSala | null;
  /** Hora (Date.now) em que a vista chegou, para o relógio correr na tela. */
  recebidaEm: number;
  conectado: boolean;
  erro: string | null;
  recusa: { texto: string; id: number } | null;
  /** Reações recebidas. "meu" e "nome" são fixados na chegada (a cor de cada um troca na revanche). */
  reacoes: ReacaoRecebida[];
  /** Wallhack: o que o adversário está olhando. */
  espiada: Espiada | null;
  /** Multitasking: quem está digitando o quê. */
  digitacao: { cor: Cor; digitacao: Digitacao } | null;
}

export interface ReacaoRecebida {
  reacao: Reacao;
  meu: boolean;
  nome: string;
  id: number;
}

/**
 * Entra na sala (e volta nela sozinho se a conexão cair) e expõe as ações do jogador.
 * Com `assistir`, entra só para ver a partida (sem cadeira e sem segredos).
 */
export function useSala(codigo: string, assistir = false) {
  const [estado, setEstado] = useState<EstadoSala>({
    vista: null,
    recebidaEm: 0,
    conectado: false,
    erro: null,
    recusa: null,
    reacoes: [],
    espiada: null,
    digitacao: null,
  });

  useEffect(() => {
    const s = conexao();
    const entrar = () => {
      if (assistir) {
        s.emit("assistirSala", { codigo }, (r: RespostaAssistir) =>
          setEstado((e) => ({ ...e, erro: r.ok ? null : r.erro })),
        );
        return;
      }
      s.emit("entrarSala", { codigo, apelido: lerApelido(), token: lerToken(codigo) }, (r: RespostaSala) => {
        if (!r.ok) {
          setEstado((e) => ({ ...e, erro: r.erro }));
          return;
        }
        guardarToken(r.codigo, r.token);
        setEstado((e) => ({ ...e, erro: null }));
      });
    };
    const aoConectar = () => {
      setEstado((e) => ({ ...e, conectado: true }));
      entrar(); // inclusive depois de cair: o token devolve a mesma cadeira
    };
    const aoCair = () => setEstado((e) => ({ ...e, conectado: false }));
    const aoVista = (vista: VistaSala) => setEstado((e) => ({ ...e, vista, recebidaEm: Date.now() }));
    const aoRecusa = (texto: string) => setEstado((e) => ({ ...e, recusa: { texto, id: Date.now() } }));
    const aoReagir = (r: { cor: Cor; reacao: Reacao }) =>
      setEstado((e) => ({
        ...e,
        reacoes: [
          ...e.reacoes.slice(-9),
          {
            reacao: r.reacao,
            meu: !e.vista?.espectador && r.cor === e.vista?.minhaCor,
            nome: e.vista?.jogadores[r.cor]?.apelido ?? "Adversário",
            id: Date.now(),
          },
        ],
      }));
    const aoErro = () =>
      setEstado((e) => ({ ...e, conectado: false, erro: e.vista ? e.erro : "Não deu para falar com o servidor." }));

    s.on("connect", aoConectar);
    s.on("disconnect", aoCair);
    s.on("connect_error", aoErro);
    s.on("sala", aoVista);
    s.on("recusado", aoRecusa);
    s.on("reacao", aoReagir);
    const aoEspiada = (espiada: Espiada) => setEstado((e) => ({ ...e, espiada }));
    const aoDigitacao = (d: { cor: Cor; digitacao: Digitacao | null }) =>
      setEstado((e) => ({ ...e, digitacao: d.digitacao ? { cor: d.cor, digitacao: d.digitacao } : null }));
    s.on("espiada", aoEspiada);
    s.on("digitacao", aoDigitacao);
    if (s.connected) aoConectar();
    return () => {
      s.off("connect", aoConectar);
      s.off("disconnect", aoCair);
      s.off("connect_error", aoErro);
      s.off("sala", aoVista);
      s.off("recusado", aoRecusa);
      s.off("reacao", aoReagir);
      s.off("espiada", aoEspiada);
      s.off("digitacao", aoDigitacao);
    };
  }, [codigo, assistir]);

  const enviar = useCallback((acao: AcaoPartida) => conexao().emit("acao", acao), []);
  const escolherDraft = useCallback((escolha: CartasDoJogador) => conexao().emit("escolherDraft", escolha), []);
  const rerolarDraft = useCallback(() => conexao().emit("rerolarDraft"), []);
  const reagir = useCallback((r: Reacao) => conexao().emit("reagir", r), []);
  const desistir = useCallback(() => conexao().emit("desistir"), []);
  const revanche = useCallback(() => conexao().emit("revanche"), []);
  const espiar = useCallback((dados: Espiada) => conexao().emit("espiar", dados), []);
  const digitar = useCallback((dados: Digitacao | null) => conexao().emit("digitando", dados), []);
  /** Larga a vaga e passa a assistir à sala. */
  const virarEspectador = useCallback(() => {
    conexao().emit("virarEspectador", (ok: boolean) => {
      if (!ok) return;
      esquecerToken(codigo);
      location.hash = `#assistir-${codigo}`;
    });
  }, [codigo]);

  return { ...estado, enviar, escolherDraft, rerolarDraft, reagir, desistir, revanche, virarEspectador, espiar, digitar };
}
