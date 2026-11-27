// Estado central da aplicação + ações. A interface se inscreve e re-renderiza a cada mudança.
import { carregarCompromissos, salvarCompromissos } from "./armazenamento.js";

const estado = {
  config: null,
  configStatus: "carregando", // carregando | ok | erro
  compromissos: [],
  conexao: typeof navigator !== "undefined" ? navigator.onLine : true,
  origem: null,
  destino: null,
  modoMapa: "origem", // origem | destino
  filtro: { busca: "", status: "todos" },
  agora: Date.now(),
};

const ouvintes = new Set();

export const obterEstado = () => estado;

export function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function atualizarEstado(parcial) {
  Object.assign(estado, parcial);
  ouvintes.forEach((fn) => fn(estado));
}

export function iniciarCompromissos() {
  const { dados, erro } = carregarCompromissos();
  atualizarEstado({ compromissos: dados });
  return erro;
}

function persistir(novaLista) {
  const resultado = salvarCompromissos(novaLista);
  if (resultado.ok) atualizarEstado({ compromissos: novaLista });
  return resultado;
}

export function adicionarCompromisso(item) {
  return persistir([...estado.compromissos, item]);
}

export function removerCompromisso(id) {
  return persistir(estado.compromissos.filter((c) => c.id !== id));
}

export function apagarTodos() {
  return persistir([]);
}

export function alternarConcluido(id) {
  return persistir(
    estado.compromissos.map((c) => (c.id === id ? { ...c, concluido: !c.concluido } : c))
  );
}

export function marcarAlarmeDisparado(id) {
  return persistir(
    estado.compromissos.map((c) => (c.id === id ? { ...c, alarmeDisparado: true } : c))
  );
}

/** Compromissos filtrados e ordenados por horário. */
export function compromissosVisiveis() {
  const busca = estado.filtro.busca.trim().toLowerCase();
  return [...estado.compromissos]
    .filter((c) => {
      if (estado.filtro.status === "pendentes" && c.concluido) return false;
      if (estado.filtro.status === "concluidos" && !c.concluido) return false;
      return !busca || c.titulo.toLowerCase().includes(busca) ||
        c.destino.nome.toLowerCase().includes(busca);
    })
    .sort((a, b) => a.dataHora - b.dataHora);
}

/** Situação calculada (não é gravada): concluido | futuro | hora-de-sair | expirado */
export function situacao(c, agora = estado.agora) {
  if (c.concluido) return "concluido";
  if (agora >= c.dataHora) return "expirado";
  if (agora >= c.saida) return "hora-de-sair";
  return "futuro";
}

export function proximoCompromisso() {
  return [...estado.compromissos]
    .filter((c) => !c.concluido && c.dataHora > estado.agora)
    .sort((a, b) => a.dataHora - b.dataHora)[0] ?? null;
}

export function novoId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
