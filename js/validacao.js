// Validação do formulário (sem DOM) — roda antes de qualquer alteração de estado.
import { distanciaKm, montarDataHora } from "./calculo.js";

export const LIMITES = {
  tituloMin: 3,
  tituloMax: 60,
  preparoMax: 240,
  distanciaMinKm: 0.05,
  distanciaMaxKm: 300,
};

/** Remove espaços extras no começo, fim e no meio do texto. */
export function normalizarTexto(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

const pontoValido = (p) =>
  p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
  Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

/**
 * Valida os dados do compromisso.
 * @returns {{valido: boolean, erros: Object<string,string>, valores: Object}}
 */
export function validarCompromisso(entrada, opcoes = {}) {
  const { agora = Date.now(), categorias = [], transportes = [] } = opcoes;
  const erros = {};

  const titulo = normalizarTexto(entrada.titulo);
  if (!titulo) erros.titulo = "Informe o nome do compromisso.";
  else if (titulo.length < LIMITES.tituloMin)
    erros.titulo = `Use pelo menos ${LIMITES.tituloMin} caracteres.`;
  else if (titulo.length > LIMITES.tituloMax)
    erros.titulo = `Use no máximo ${LIMITES.tituloMax} caracteres.`;

  const categoria = normalizarTexto(entrada.categoria);
  if (!categoria) erros.categoria = "Escolha uma categoria.";
  else if (categorias.length && !categorias.includes(categoria))
    erros.categoria = "Categoria inválida.";

  const transporte = normalizarTexto(entrada.transporte);
  if (!transporte) erros.transporte = "Escolha o meio de transporte.";
  else if (transportes.length && !transportes.includes(transporte))
    erros.transporte = "Meio de transporte inválido.";

  let dataHora = null;
  if (!entrada.data) erros.data = "Informe a data.";
  if (!entrada.horario) erros.horario = "Informe o horário.";
  if (entrada.data && entrada.horario) {
    dataHora = montarDataHora(entrada.data, entrada.horario);
    if (dataHora === null) erros.data = "Data ou horário inválido.";
    else if (dataHora <= agora)
      erros.horario = "O compromisso precisa estar no futuro.";
  }

  const textoPreparo = normalizarTexto(entrada.preparoMin);
  const preparoMin = Number(textoPreparo);
  if (textoPreparo === "") erros.preparoMin = "Informe o tempo de preparo (pode ser 0).";
  else if (!Number.isInteger(preparoMin) || preparoMin < 0 || preparoMin > LIMITES.preparoMax)
    erros.preparoMin = `Use um número inteiro entre 0 e ${LIMITES.preparoMax}.`;

  if (!pontoValido(entrada.origem)) erros.origem = "Defina a origem (GPS ou clique no mapa).";
  if (!pontoValido(entrada.destino)) erros.destino = "Defina o destino (busca ou clique no mapa).";
  if (!erros.origem && !erros.destino) {
    const d = distanciaKm(entrada.origem, entrada.destino);
    if (d < LIMITES.distanciaMinKm)
      erros.destino = "Origem e destino estão no mesmo lugar. Escolha outro destino.";
    else if (d > LIMITES.distanciaMaxKm)
      erros.destino = `A distância passa de ${LIMITES.distanciaMaxKm} km; o estimador é para trajetos urbanos/regionais.`;
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    valores: { titulo, categoria, transporte, dataHora, preparoMin },
  };
}
