const VERSAO = "v1";
const CACHE_APP = `hora-de-sair-app-${VERSAO}`;
const CACHE_TILES = `hora-de-sair-tiles-${VERSAO}`;
const MAX_TILES = 80;

const ARQUIVOS_ESSENCIAIS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "data/dados.json",
  "assets/imagens/icone.svg",
  "js/app.js",
  "js/armazenamento.js",
  "js/calculo.js",
  "js/dispositivo.js",
  "js/estado.js",
  "js/interface.js",
  "js/mapa.js",
  "js/navegacao.js",
  "js/validacao.js",
  "lib/leaflet/leaflet.js",
  "lib/leaflet/leaflet.css",
  "lib/leaflet/images/layers.png",
  "lib/leaflet/images/layers-2x.png",
  "lib/leaflet/images/marker-icon.png",
  "lib/leaflet/images/marker-icon-2x.png",
  "lib/leaflet/images/marker-shadow.png",
  "lib/geocoder/Control.Geocoder.js",
  "lib/geocoder/Control.Geocoder.css",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_APP)
      .then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((c) => c.startsWith("hora-de-sair-") && c !== CACHE_APP && c !== CACHE_TILES)
            .map((c) => caches.delete(c))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function limitarCache(nome, maximo) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  if (chaves.length > maximo) {
    await Promise.all(chaves.slice(0, chaves.length - maximo).map((c) => cache.delete(c)));
  }
}

// Network-first: tenta a rede (dados atualizados); sem rede, usa o cache.
async function redePrimeiro(requisicao) {
  try {
    const resposta = await fetch(requisicao);
    if (resposta.ok) (await caches.open(CACHE_APP)).put(requisicao, resposta.clone());
    return resposta;
  } catch {
    const emCache = await caches.match(requisicao, { ignoreSearch: true });
    if (emCache) return emCache;
    throw new Error("offline e sem cache");
  }
}

// Cache-first: arquivos do app mudam só quando a VERSAO muda.
async function cachePrimeiro(requisicao) {
  const emCache = await caches.match(requisicao, { ignoreSearch: true });
  if (emCache) return emCache;
  const resposta = await fetch(requisicao);
  if (resposta.ok) (await caches.open(CACHE_APP)).put(requisicao, resposta.clone());
  return resposta;
}

// Stale-while-revalidate para as imagens do mapa (limitado a MAX_TILES).
async function tiles(requisicao) {
  const cache = await caches.open(CACHE_TILES);
  const emCache = await cache.match(requisicao);
  const rede = fetch(requisicao)
    .then((resposta) => {
      if (resposta.ok || resposta.type === "opaque") {
        cache.put(requisicao, resposta.clone()).then(() => limitarCache(CACHE_TILES, MAX_TILES));
      }
      return resposta;
    })
    .catch(() => null);
  return emCache ?? (await rede) ?? Response.error();
}

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    evento.respondWith(tiles(req));
    return;
  }
  if (url.origin !== self.location.origin) return; // ex.: busca Nominatim — não é cacheada

  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req).catch(() => caches.match("index.html", { ignoreSearch: true }))
    );
    return;
  }
  if (url.pathname.endsWith("/data/dados.json")) {
    evento.respondWith(redePrimeiro(req));
    return;
  }
  evento.respondWith(cachePrimeiro(req));
});
