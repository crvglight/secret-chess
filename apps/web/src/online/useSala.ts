import { useCallback, useEffect, useState } from "react";
import type { AcaoPartida, CartasDoJogador, Cor, Reacao, RespostaAssistir, RespostaSala, VistaSala } from "@xadrez/engine";
import { conexao, guardarToken, lerApelido, lerToken } from "./conexao.ts";

export interface EstadoSala {
  vista: VistaSala | null;
  /** Hora (Date.now) em que a vista chegou, para o relógio correr na tela. */
  recebidaEm: number;
  conectado: boolean;
  erro: string | null;
  recusa: { texto: string; id: number } | null;
  /** Reações recebidas. "meu" e "nome" são fixados na chegada (a cor de cada um troca na revanche). */
  reacoes: ReacaoRecebida[];
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
    if (s.connected) aoConectar();
    return () => {
      s.off("connect", aoConectar);
      s.off("disconnect", aoCair);
      s.off("connect_error", aoErro);
      s.off("sala", aoVista);
      s.off("recusado", aoRecusa);
      s.off("reacao", aoReagir);
    };
  }, [codigo, assistir]);

  const enviar = useCallback((acao: AcaoPartida) => conexao().emit("acao", acao), []);
  const escolherDraft = useCallback((escolha: CartasDoJogador) => conexao().emit("escolherDraft", escolha), []);
  const rerolarDraft = useCallback(() => conexao().emit("rerolarDraft"), []);
  const reagir = useCallback((r: Reacao) => conexao().emit("reagir", r), []);
  const desistir = useCallback(() => conexao().emit("desistir"), []);
  const revanche = useCallback(() => conexao().emit("revanche"), []);

  return { ...estado, enviar, escolherDraft, rerolarDraft, reagir, desistir, revanche };
}
