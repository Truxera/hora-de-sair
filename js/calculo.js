// Funções puras de cálculo (sem DOM) — testáveis em Node.

const RAIO_TERRA_KM = 6371;
const rad = (graus) => (graus * Math.PI) / 180;

/** Distância em linha reta (Haversine) entre dois pontos {lat, lng}, em km. */
export function distanciaKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Estima o tempo de percurso em minutos.
 * A distância em linha reta é multiplicada por um fator de rota (ruas não são retas)
 * e dividida pela velocidade média do meio de transporte.
 */
export function estimarMinutosViagem(distKm, velocidadeKmH, fatorRota = 1.3) {
  if (!(velocidadeKmH > 0)) throw new RangeError("velocidade inválida");
  const minutos = Math.ceil(((distKm * fatorRota) / velocidadeKmH) * 60);
  return Math.max(1, minutos);
}

/** Horário de saída (ms) = horário do compromisso − viagem − preparo. */
export function calcularSaida(dataHoraMs, minutosViagem, preparoMin) {
  return dataHoraMs - (minutosViagem + preparoMin) * 60000;
}

/** Converte "AAAA-MM-DD" + "HH:MM" (horário local) em ms. Retorna null se inválido. */
export function montarDataHora(dataStr, horaStr) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataStr ?? "");
  const h = /^(\d{2}):(\d{2})$/.exec(horaStr ?? "");
  if (!d || !h) return null;
  const [ano, mes, dia] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hora, min] = [Number(h[1]), Number(h[2])];
  const data = new Date(ano, mes - 1, dia, hora, min, 0, 0);
  // rejeita datas "roladas" (ex.: 31/02)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia ||
    hora > 23 ||
    min > 59
  ) {
    return null;
  }
  return data.getTime();
}

const doisDigitos = (n) => String(n).padStart(2, "0");

export function formatarHora(ms) {
  const d = new Date(ms);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function formatarData(ms) {
  const d = new Date(ms);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 75 -> "1 h 15 min"; 40 -> "40 min" */
export function formatarDuracao(minutos) {
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${h} h` : `${h} h ${doisDigitos(resto)} min`;
}
