const form = document.querySelector("#form-compromisso");
const btnLocal = document.querySelector("#btn-local");
const btnLimparMapa = document.querySelector("#btn-limpar-mapa");
const btnApagarTodos = document.querySelector("#btn-apagar-todos");
const btnTema = document.querySelector("#btn-tema");
const inputBusca = document.querySelector("#busca-compromisso");
const txtOrigem = document.querySelector("#txt-origem");
const txtStatusMapa = document.querySelector("#txt-status-mapa");
const listaCompromissos = document.querySelector("#lista-compromissos");
const statusConexao = document.querySelector("#status-conexao");

let coordOrigem = null;
let coordDestino = null;
let marcadorOrigem = null;
let marcadorDestino = null;

// 🌙 Sistema de Tema (Dark / Light Mode)
if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark-mode");
  btnTema.textContent = "☀️ Tema";
}
btnTema.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("tema", isDark ? "dark" : "light");
  btnTema.textContent = isDark ? "☀️ Tema" : "🌙 Tema";
});

// 1. Inicializar Mapa
const mapa = L.map("mapa").setView([-11.175, -61.901], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(mapa);

txtStatusMapa.textContent = "Modo atual: Clique no mapa para definir sua ORIGEM.";

let geocoderControl = null;

function atualizarBarraPesquisa() {
  if (geocoderControl) mapa.removeControl(geocoderControl);

  const options = {
    defaultMarkGeocode: false,
    placeholder: "Pesquisar local ou estabelecimento...",
    geocoder: L.Control.Geocoder.nominatim()
  };

  if (coordOrigem) {
    options.geocoder = L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
        viewbox: `${coordOrigem.lng - 0.2},${coordOrigem.lat - 0.2},${coordOrigem.lng + 0.2},${coordOrigem.lat + 0.2}`,
        bounded: 0
      }
    });
  }

  geocoderControl = L.Control.geocoder(options).addTo(mapa);

  geocoderControl.on("markgeocode", (e) => {
    const centro = e.geocode.center;
    mapa.setView(centro, 16);

    let nomeLocal = e.geocode.name;
    if (e.geocode.properties && e.geocode.properties.address) {
      const p = e.geocode.properties;
      if (p.name) {
        nomeLocal = `${p.name} (${e.geocode.name})`;
      }
    }

    definirDestino(centro, nomeLocal);
    
    const inputTitulo = document.querySelector("#titulo");
    if (inputTitulo && !inputTitulo.value) {
      inputTitulo.value = e.geocode.name.split(',')[0];
    }
  });
}

atualizarBarraPesquisa();

function definirDestino(latlng, nomePopup = "Destino do Compromisso") {
  coordDestino = { lat: latlng.lat, lng: latlng.lng };
  if (marcadorDestino) {
    marcadorDestino.setLatLng(latlng).setPopupContent(nomePopup).openPopup();
  } else {
    marcadorDestino = L.marker(latlng).addTo(mapa).bindPopup(nomePopup).openPopup();
  }
  txtStatusMapa.textContent = `Destino: ${nomePopup}`;
}

function limparMarcacoes() {
  if (marcadorOrigem) { mapa.removeLayer(marcadorOrigem); marcadorOrigem = null; }
  if (marcadorDestino) { mapa.removeLayer(marcadorDestino); marcadorDestino = null; }
  coordOrigem = null;
  coordDestino = null;
  txtOrigem.textContent = "Sua origem: clique no mapa ou use o GPS.";
  txtStatusMapa.textContent = "Modo atual: Clique no mapa para definir sua ORIGEM.";
  atualizarBarraPesquisa();
}

btnLimparMapa.addEventListener("click", limparMarcacoes);

mapa.on("click", (e) => {
  if (!coordOrigem) {
    coordOrigem = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (marcadorOrigem) {
      marcadorOrigem.setLatLng(e.latlng);
    } else {
      marcadorOrigem = L.circleMarker(e.latlng, {
        color: "blue", radius: 8, fillColor: "blue", fillOpacity: 0.8
      }).addTo(mapa).bindPopup("Sua Origem").openPopup();
    }
    txtOrigem.textContent = `Origem marcada: ${coordOrigem.lat.toFixed(4)}, ${coordOrigem.lng.toFixed(4)}`;
    txtStatusMapa.textContent = "Origem pronta! Agora clique no mapa ou busque o DESTINO.";
    atualizarBarraPesquisa();
  } else {
    definirDestino(e.latlng, "Destino Manual");
  }
});

// 2. Conexão Online/Offline
function atualizarConexao() {
  statusConexao.textContent = navigator.onLine ? "🌐 Online" : "⚠️ Offline (Modo Local)";
  statusConexao.style.color = navigator.onLine ? "#d1fae5" : "#f87171";
}
window.addEventListener("online", atualizarConexao);
window.addEventListener("offline", atualizarConexao);
atualizarConexao();

function pedirPermissaoNotificacao() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

btnLocal.addEventListener("click", () => {
  pedirPermissaoNotificacao();
  if (!navigator.geolocation) { alert("Geolocalização não suportada."); return; }
  txtOrigem.textContent = "Obtendo GPS automático...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      coordOrigem = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      txtOrigem.textContent = `Origem via GPS obtida!`;
      mapa.setView([coordOrigem.lat, coordOrigem.lng], 15);
      if (marcadorOrigem) {
        marcadorOrigem.setLatLng([coordOrigem.lat, coordOrigem.lng]);
      } else {
        marcadorOrigem = L.circleMarker([coordOrigem.lat, coordOrigem.lng], {
          color: "blue", radius: 8, fillColor: "blue", fillOpacity: 0.8
        }).addTo(mapa).bindPopup("Sua Origem").openPopup();
      }
      txtStatusMapa.textContent = "GPS definido! Agora clique no mapa ou busque o Destino.";
      atualizarBarraPesquisa();
    },
    () => { txtOrigem.textContent = "Erro no GPS. Clique no mapa."; }
  );
});

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calcularDeslocamento(horarioStr, distanciaKm) {
  const minutosViagem = Math.round((distanciaKm / 30) * 60) + 10;
  const [horas, minutos] = horarioStr.split(":").map(Number);
  let totalMinutos = horas * 60 + minutos - minutosViagem;
  if (totalMinutos < 0) totalMinutos += 24 * 60;
  
  const h = String(Math.floor(totalMinutos / 60)).padStart(2, "0");
  const m = String(totalMinutos % 60).padStart(2, "0");
  return { horarioSaida: `${h}:${m}`, minutosViagem };
}

// 3. Sistema de Alarme Inteligente (Verificação a cada 30 segundos)
setInterval(() => {
  const dados = JSON.parse(localStorage.getItem("compromissos-mapa-v3")) || [];
  if (dados.length === 0) return;

  const agora = new Date();
  const horaAtual = String(agora.getHours()).padStart(2, '0') + ":" + String(agora.getMinutes()).padStart(2, '0');

  dados.forEach(item => {
    if (item.horarioSaida === horaAtual && !item.alarmeDisparado) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⏰ HORA DE SAIR!", {
          body: `Seu compromisso "${item.titulo}" é às ${item.horario}. Saia agora!`,
          icon: "https://cdn-icons-png.flaticon.com/512/3236/3236940.png"
        });
      }
      alert(`⏰ HORA DE SAIR!\nCompromisso: ${item.titulo}\nPartida recomendada: ${item.horarioSaida}`);
      item.alarmeDisparado = true;
      localStorage.setItem("compromissos-mapa-v3", JSON.stringify(dados));
    }
  });
}, 30000);

// 4. Gestão da Lista (Exclusão, Filtro e Renderização)
window.deletarCompromisso = function(index) {
  const dados = JSON.parse(localStorage.getItem("compromissos-mapa-v3")) || [];
  dados.splice(index, 1);
  localStorage.setItem("compromissos-mapa-v3", JSON.stringify(dados));
  carregarCompromissos();
};

btnApagarTodos.addEventListener("click", () => {
  if (confirm("Tem certeza que deseja apagar todos os compromissos salvos?")) {
    localStorage.removeItem("compromissos-mapa-v3");
    carregarCompromissos();
  }
});

inputBusca.addEventListener("input", () => {
  carregarCompromissos(inputBusca.value.toLowerCase());
});

function carregarCompromissos(filtro = "") {
  const dados = JSON.parse(localStorage.getItem("compromissos-mapa-v3")) || [];
  listaCompromissos.innerHTML = "";
  
  const dadosFiltrados = dados.filter(item => item.titulo.toLowerCase().includes(filtro));

  if (dadosFiltrados.length === 0) {
    listaCompromissos.innerHTML = "<li>Nenhum compromisso encontrado.</li>";
    return;
  }

  dadosFiltrados.forEach((item, index) => {
    const linkGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${item.origemLat},${item.origemLng}&destination=${item.destLat},${item.destLng}`;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>📌 ${item.titulo}</strong> — Marcado para às <b>${item.horario}</b><br>
      📏 Distância: <b>${item.distancia} km</b> (~${item.minutosViagem} min de trajeto)<br>
      <span style="color: #ef4444; font-weight: bold;">⏰ Sair de casa às: ${item.horarioSaida}</span>
      <div class="acoes-item">
        <a href="${linkGoogleMaps}" target="_blank" class="btn-rota">🗺️ Rota GPS</a>
        <button onclick="deletarCompromisso(${index})" class="btn-deletar">🗑️ Excluir</button>
      </div>
    `;
    listaCompromissos.appendChild(li);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  pedirPermissaoNotificacao();

  if (!coordOrigem || !coordDestino) {
    alert("Por favor, defina sua Origem e o Destino no mapa antes de salvar!");
    return;
  }

  const titulo = document.querySelector("#titulo").value;
  const horario = document.querySelector("#horario").value;

  const distancia = calcularDistanciaKm(
    coordOrigem.lat, coordOrigem.lng,
    coordDestino.lat, coordDestino.lng
  );
  const { horarioSaida, minutosViagem } = calcularDeslocamento(horario, distancia);

  const novoItem = {
    titulo,
    horario,
    distancia: distancia.toFixed(2),
    minutosViagem,
    horarioSaida,
    origemLat: coordOrigem.lat,
    origemLng: coordOrigem.lng,
    destLat: coordDestino.lat,
    destLng: coordDestino.lng,
    alarmeDisparado: false
  };

  const dados = JSON.parse(localStorage.getItem("compromissos-mapa-v3")) || [];
  dados.push(novoItem);
  localStorage.setItem("compromissos-mapa-v3", JSON.stringify(dados));

  form.reset();
  limparMarcacoes();
  carregarCompromissos();
  alert("Compromisso salvo com sucesso!");
});

carregarCompromissos();