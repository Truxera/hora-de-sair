// Persistência no localStorage com tratamento de erros.
// Conteúdo inválido NUNCA derruba a aplicação: é descartado (com backup) e o app segue vazio.

export const CHAVE_COMPROMISSOS = "hora-de-sair:compromissos:v1";
export const CHAVE_BACKUP = "hora-de-sair:compromissos:backup-invalido";
export const CHAVE_TEMA = "hora-de-sair:tema";

const num = (v) => typeof v === "number" && Number.isFinite(v);
const ponto = (p) => p && num(p.lat) && num(p.lng);

/** Mantém só registros com a estrutura esperada. */
export function sanitizarLista(bruto) {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter(
      (i) =>
        i && typeof i.id === "string" && typeof i.titulo === "string" &&
        num(i.dataHora) && num(i.saida) && num(i.minutosViagem) &&
        num(i.distanciaKm) && ponto(i.origem) && ponto(i.destino)
    )
    .map((i) => ({
      id: i.id,
      titulo: i.titulo.slice(0, 60),
      categoria: typeof i.categoria === "string" ? i.categoria : "outro",
      transporte: typeof i.transporte === "string" ? i.transporte : "carro",
      dataHora: i.dataHora,
      preparoMin: num(i.preparoMin) ? i.preparoMin : 0,
      minutosViagem: i.minutosViagem,
      distanciaKm: i.distanciaKm,
      saida: i.saida,
      origem: { lat: i.origem.lat, lng: i.origem.lng },
      destino: {
        lat: i.destino.lat,
        lng: i.destino.lng,
        nome: typeof i.destino.nome === "string" ? i.destino.nome.slice(0, 120) : "",
      },
      concluido: i.concluido === true,
      alarmeDisparado: i.alarmeDisparado === true,
      criadoEm: num(i.criadoEm) ? i.criadoEm : Date.now(),
    }));
}

function obterStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // acesso bloqueado (modo privado restrito, política do navegador)
  }
}

/** @returns {{dados: Array, erro: string|null}} */
export function carregarCompromissos(storage = obterStorage()) {
  if (!storage) return { dados: [], erro: "indisponivel" };
  let texto;
  try {
    texto = storage.getItem(CHAVE_COMPROMISSOS);
  } catch {
    return { dados: [], erro: "indisponivel" };
  }
  if (texto == null) return { dados: [], erro: null };
  try {
    const bruto = JSON.parse(texto);
    if (!Array.isArray(bruto)) throw new TypeError("formato inesperado");
    return { dados: sanitizarLista(bruto), erro: null };
  } catch {
    try {
      storage.setItem(CHAVE_BACKUP, texto); // guarda o conteúdo para recuperação manual
    } catch { /* sem espaço: ignora */ }
    return { dados: [], erro: "invalido" };
  }
}

/** @returns {{ok: boolean, erro: string|null}} */
export function salvarCompromissos(lista, storage = obterStorage()) {
  if (!storage) return { ok: false, erro: "indisponivel" };
  try {
    storage.setItem(CHAVE_COMPROMISSOS, JSON.stringify(lista));
    return { ok: true, erro: null };
  } catch {
    return { ok: false, erro: "falha-gravacao" }; // cota cheia ou bloqueio
  }
}

export function lerTema(storage = obterStorage()) {
  try {
    return storage?.getItem(CHAVE_TEMA) ?? null;
  } catch {
    return null;
  }
}

export function salvarTema(tema, storage = obterStorage()) {
  try {
    storage?.setItem(CHAVE_TEMA, tema);
  } catch { /* preferência de tema é opcional */ }
}
