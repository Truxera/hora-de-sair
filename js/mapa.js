// Mapa (Leaflet, versão local em /lib) para escolher origem e destino.
// Se a biblioteca não carregar, o restante do app continua funcionando.

let mapa = null;
let marcadorOrigem = null;
let marcadorDestino = null;
let controleBusca = null;

export const mapaDisponivel = () => typeof window.L !== "undefined";

export function mapaIniciado() {
  return mapa !== null;
}

/**
 * @param {{centro:{lat,lng,zoom}, aoClicar:(ponto)=>void, aoBuscar:(ponto,nome)=>void, aoFalharTiles:()=>void}} opcoes
 */
export function iniciarMapa(elemento, opcoes) {
  if (mapa || !mapaDisponivel()) return false;
  const { centro, aoClicar, aoBuscar, aoFalharTiles } = opcoes;

  mapa = L.map(elemento).setView([centro.lat, centro.lng], centro.zoom);
  const camada = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  camada.on("tileerror", () => aoFalharTiles?.());

  mapa.on("click", (e) => aoClicar({ lat: e.latlng.lat, lng: e.latlng.lng }));

  // Busca de lugares (Nominatim). Só funciona online; o resto do mapa não depende dela.
  if (L.Control?.Geocoder) {
    controleBusca = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: "Pesquisar local…",
      errorMessage: "Nada encontrado (ou sem conexão).",
      geocoder: L.Control.Geocoder.nominatim(),
    }).addTo(mapa);
    controleBusca.on("markgeocode", (e) => {
      const centroBusca = e.geocode.center;
      mapa.setView(centroBusca, 16);
      aoBuscar({ lat: centroBusca.lat, lng: centroBusca.lng }, e.geocode.name);
    });
  }
  return true;
}

/** Leaflet precisa recalcular o tamanho quando o contêiner estava oculto. */
export function reajustarMapa() {
  if (mapa) setTimeout(() => mapa.invalidateSize(), 0);
}

export function centralizar(ponto, zoom = 15) {
  mapa?.setView([ponto.lat, ponto.lng], zoom);
}

function criarMarcador(ponto, tipo, texto) {
  const opcoes =
    tipo === "origem"
      ? L.circleMarker([ponto.lat, ponto.lng], { color: "#1d4ed8", fillColor: "#1d4ed8", fillOpacity: 0.85, radius: 9 })
      : L.marker([ponto.lat, ponto.lng]);
  return opcoes.addTo(mapa).bindPopup(texto);
}

export function mostrarOrigem(ponto) {
  if (!mapa) return;
  if (marcadorOrigem) mapa.removeLayer(marcadorOrigem);
  marcadorOrigem = ponto ? criarMarcador(ponto, "origem", "Origem") : null;
}

export function mostrarDestino(ponto, nome = "Destino") {
  if (!mapa) return;
  if (marcadorDestino) mapa.removeLayer(marcadorDestino);
  marcadorDestino = ponto ? criarMarcador(ponto, "destino", nome) : null;
}
