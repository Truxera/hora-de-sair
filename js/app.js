// liga estado, rotas, formulário, mapa, dispositivo e Service Worker.
import {
  distanciaKm, estimarMinutosViagem, calcularSaida, montarDataHora,
} from "./calculo.js";
import { validarCompromisso, normalizarTexto } from "./validacao.js";
import { lerTema, salvarTema } from "./armazenamento.js";
import {
  obterEstado, atualizarEstado, assinar, iniciarCompromissos, adicionarCompromisso,
  removerCompromisso, apagarTodos, alternarConcluido, marcarAlarmeDisparado,
  compromissosVisiveis, situacao, proximoCompromisso, novoId,
} from "./estado.js";
import { iniciarNavegacao, irPara } from "./navegacao.js";
import {
  obterPosicao, pedirPermissaoNotificacao, notificar, compartilharTexto,
} from "./dispositivo.js";
import {
  iniciarMapa, mapaIniciado, mapaDisponivel, reajustarMapa, centralizar,
  mostrarOrigem, mostrarDestino,
} from "./mapa.js";
import * as ui from "./interface.js";

const $ = (s) => document.querySelector(s);

// Valores usados apenas se o fetch de data/dados.json falhar (a app continua utilizável).
const CONFIG_PADRAO = {
  centroPadrao: { lat: -10.8853, lng: -61.9517, zoom: 13 },
  fatorRota: 1.3,
  preparoPadraoMin: 10,
  categorias: [{ id: "outro", nome: "Outro" }],
  transportes: [
    { id: "carro", nome: "Carro", velocidadeKmH: 30 },
    { id: "a-pe", nome: "A pé", velocidadeKmH: 5 },
  ],
};

let destinoNome = "";

// ---------- Tema ----------
const temaInicial =
  lerTema() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
ui.aplicarTema(temaInicial);
$("#btn-tema").addEventListener("click", () => {
  const novo = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
  ui.aplicarTema(novo);
  salvarTema(novo);
});

// ---------- Dados iniciais via fetch ----------
function configValida(c) {
  return c && Array.isArray(c.categorias) && c.categorias.length > 0 &&
    Array.isArray(c.transportes) && c.transportes.length > 0 &&
    c.transportes.every((t) => t.id && t.velocidadeKmH > 0);
}

async function carregarConfig() {
  atualizarEstado({ configStatus: "carregando" });
  ui.renderConfigStatus("carregando");
  try {
    const resposta = await fetch("data/dados.json", { cache: "no-cache" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const json = await resposta.json();
    if (!configValida(json)) throw new Error("estrutura inválida");
    atualizarEstado({ config: json, configStatus: "ok" });
    ui.renderConfigStatus("ok");
  } catch (erro) {
    console.warn("Falha ao carregar data/dados.json:", erro);
    atualizarEstado({ config: obterEstado().config ?? CONFIG_PADRAO, configStatus: "erro" });
    ui.renderConfigStatus(
      "erro",
      "Não foi possível carregar os dados do arquivo (sem conexão ou arquivo ausente). Usando opções básicas."
    );
  }
  ui.preencherSelects(obterEstado().config);
  if (!$("#preparoMin").value) $("#preparoMin").value = obterEstado().config.preparoPadraoMin ?? 10;
  atualizarPrevia();
}
$("#btn-recarregar-config").addEventListener("click", carregarConfig);

// ---------- Trajeto (origem / destino) ----------
function renderTrajeto() {
  const e = obterEstado();
  ui.renderTrajeto({ origem: e.origem, destino: e.destino, destinoNome, modo: e.modoMapa });
}

function definirOrigem(ponto) {
  atualizarEstado({ origem: ponto, modoMapa: "destino" });
  mostrarOrigem(ponto);
  ui.limparErro("origem");
  renderTrajeto();
  atualizarPrevia();
}

function definirDestino(ponto, nome = "") {
  destinoNome = normalizarTexto(nome).slice(0, 120);
  atualizarEstado({ destino: ponto });
  mostrarDestino(ponto, destinoNome || "Destino");
  ui.limparErro("destino");
  renderTrajeto();
  atualizarPrevia();
}

function limparTrajeto() {
  destinoNome = "";
  atualizarEstado({ origem: null, destino: null, modoMapa: "origem" });
  mostrarOrigem(null);
  mostrarDestino(null);
  renderTrajeto();
  atualizarPrevia();
}

$("#btn-modo-origem").addEventListener("click", () => { atualizarEstado({ modoMapa: "origem" }); renderTrajeto(); });
$("#btn-modo-destino").addEventListener("click", () => { atualizarEstado({ modoMapa: "destino" }); renderTrajeto(); });
$("#btn-limpar-mapa").addEventListener("click", limparTrajeto);

$("#btn-gps").addEventListener("click", async () => {
  ui.setGpsOcupado(true);
  try {
    const posicao = await obterPosicao();
    definirOrigem({ lat: posicao.lat, lng: posicao.lng });
    centralizar(posicao);
    ui.toast("Localização obtida. Agora escolha o destino no mapa.", "sucesso");
  } catch (erro) {
    ui.toast(erro.mensagem ?? "Falha ao obter localização.", "aviso", 7000);
  } finally {
    ui.setGpsOcupado(false);
  }
});

function iniciarMapaSeNecessario() {
  if (mapaIniciado()) { reajustarMapa(); return; }
  if (!mapaDisponivel()) {
    $("#mapa").textContent = "Mapa indisponível (biblioteca não carregada). Recarregue a página.";
    return;
  }
  let avisouTiles = false;
  iniciarMapa($("#mapa"), {
    centro: obterEstado().config?.centroPadrao ?? CONFIG_PADRAO.centroPadrao,
    aoClicar: (ponto) => {
      if (obterEstado().modoMapa === "origem") definirOrigem(ponto);
      else definirDestino(ponto, "Ponto marcado no mapa");
    },
    aoBuscar: (ponto, nome) => {
      definirDestino(ponto, nome);
      if (!$("#titulo").value) $("#titulo").value = normalizarTexto(nome.split(",")[0]).slice(0, 60);
    },
    aoFalharTiles: () => {
      if (avisouTiles) return;
      avisouTiles = true;
      ui.toast("Parte do mapa não pôde ser carregada. Você ainda pode marcar os pontos.", "aviso");
    },
  });
  const e = obterEstado();
  mostrarOrigem(e.origem);
  mostrarDestino(e.destino, destinoNome || "Destino");
  reajustarMapa();
}

// ---------- Formulário ----------
const form = $("#form-compromisso");

function lerFormulario() {
  const e = obterEstado();
  return {
    titulo: $("#titulo").value,
    categoria: $("#categoria").value,
    data: $("#data").value,
    horario: $("#horario").value,
    transporte: $("#transporte").value,
    preparoMin: $("#preparoMin").value,
    origem: e.origem,
    destino: e.destino,
  };
}

function opcoesValidacao() {
  const cfg = obterEstado().config ?? CONFIG_PADRAO;
  return {
    agora: Date.now(),
    categorias: cfg.categorias.map((c) => c.id),
    transportes: cfg.transportes.map((t) => t.id),
  };
}

function calcular(valores, origem, destino) {
  const cfg = obterEstado().config ?? CONFIG_PADRAO;
  const veloc = cfg.transportes.find((t) => t.id === valores.transporte).velocidadeKmH;
  const distancia = distanciaKm(origem, destino);
  const viagem = estimarMinutosViagem(distancia, veloc, cfg.fatorRota ?? 1.3);
  const saida = calcularSaida(valores.dataHora, viagem, valores.preparoMin);
  return { distancia, viagem, saida };
}

function atualizarPrevia() {
  const entrada = lerFormulario();
  const r = validarCompromisso(entrada, { ...opcoesValidacao(), agora: 0 });
  // prévia só quando os dados de cálculo estão coerentes (ignora o erro "no futuro")
  const bloqueantes = ["data", "horario", "transporte", "preparoMin", "origem", "destino"];
  if (bloqueantes.some((c) => r.erros[c]) || r.valores.dataHora === null) {
    ui.renderPrevia(null);
    return;
  }
  const c = calcular(r.valores, entrada.origem, entrada.destino);
  ui.renderPrevia({ distancia: c.distancia, viagem: c.viagem, preparo: r.valores.preparoMin, saida: c.saida });
}

form.addEventListener("input", (e) => { if (e.target.id) ui.limparErro(e.target.id); atualizarPrevia(); });
form.addEventListener("change", (e) => { if (e.target.id) ui.limparErro(e.target.id); atualizarPrevia(); });

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const entrada = lerFormulario();
  const r = validarCompromisso(entrada, opcoesValidacao());

  if (!r.valido) {
    ui.mostrarErros(r.erros); // campos já preenchidos permanecem como estão
    ui.toast("Corrija os campos destacados.", "erro");
    return;
  }
  ui.limparErros();

  const { distancia, viagem, saida } = calcular(r.valores, entrada.origem, entrada.destino);
  const item = {
    id: novoId(),
    titulo: r.valores.titulo,
    categoria: r.valores.categoria,
    transporte: r.valores.transporte,
    dataHora: r.valores.dataHora,
    preparoMin: r.valores.preparoMin,
    minutosViagem: viagem,
    distanciaKm: Number(distancia.toFixed(3)),
    saida,
    origem: { ...entrada.origem },
    destino: { ...entrada.destino, nome: destinoNome },
    concluido: false,
    alarmeDisparado: false,
    criadoEm: Date.now(),
  };

  const resultado = adicionarCompromisso(item);
  if (!resultado.ok) {
    ui.toast(
      "Não foi possível salvar no aparelho (armazenamento cheio ou bloqueado). Seus dados continuam no formulário.",
      "erro", 8000
    );
    return;
  }

  ui.toast("Compromisso salvo com sucesso!", "sucesso");
  pedirPermissaoNotificacao(); // dentro de um gesto do usuário
  ui.resetarFormulario(obterEstado().config);
  limparTrajeto();
  irPara("compromissos");
});

$("#btn-limpar-form").addEventListener("click", () => {
  ui.resetarFormulario(obterEstado().config);
  limparTrajeto();
});

// ---------- Lista ----------
$("#busca").addEventListener("input", (e) =>
  atualizarEstado({ filtro: { ...obterEstado().filtro, busca: e.target.value } }));
$("#filtro-status").addEventListener("change", (e) =>
  atualizarEstado({ filtro: { ...obterEstado().filtro, status: e.target.value } }));

$("#btn-apagar-todos").addEventListener("click", () => {
  if (!confirm("Tem certeza que deseja apagar TODOS os compromissos? Esta ação não pode ser desfeita.")) return;
  const r = apagarTodos();
  ui.toast(r.ok ? "Todos os compromissos foram apagados." : "Não foi possível apagar os dados.", r.ok ? "sucesso" : "erro");
});

$("#lista-compromissos").addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const { acao, id } = botao.dataset;
  const item = obterEstado().compromissos.find((c) => c.id === id);
  if (!item) return;

  if (acao === "excluir") {
    if (!confirm(`Excluir o compromisso "${item.titulo}"?`)) return;
    const r = removerCompromisso(id);
    ui.toast(r.ok ? "Compromisso excluído." : "Não foi possível excluir.", r.ok ? "sucesso" : "erro");
  } else if (acao === "concluir") {
    const r = alternarConcluido(id);
    if (!r.ok) ui.toast("Não foi possível atualizar a situação.", "erro");
  } else if (acao === "compartilhar") {
    const resultado = await compartilharTexto(ui.textoCompartilhar(item));
    const msgs = {
      compartilhado: ["Compartilhado!", "sucesso"],
      copiado: ["Texto copiado para a área de transferência.", "sucesso"],
      cancelado: ["Compartilhamento cancelado.", "aviso"],
      indisponivel: ["Compartilhar não está disponível neste navegador.", "aviso"],
    };
    ui.toast(...msgs[resultado]);
  }
});

// ---------- Render geral ----------
function renderTudo() {
  const e = obterEstado();
  const cfg = e.config ?? CONFIG_PADRAO;
  ui.renderLista({
    itens: compromissosVisiveis(), agora: e.agora, config: cfg, situacao,
    totalGeral: e.compromissos.length,
  });
  ui.renderInicio({
    proximo: proximoCompromisso(), total: e.compromissos.length,
    pendentes: e.compromissos.filter((c) => !c.concluido && c.dataHora > e.agora).length,
    config: cfg, agora: e.agora,
  });
}
assinar(renderTudo);

// ---------- Conexão ----------
function atualizarConexao() {
  const online = navigator.onLine;
  const mudou = obterEstado().conexao !== online;
  atualizarEstado({ conexao: online });
  ui.renderConexao(online);
  if (mudou) {
    ui.toast(online ? "Conexão restabelecida." : "Você está offline. O app continua funcionando com os dados salvos.",
      online ? "sucesso" : "aviso");
  }
}
window.addEventListener("online", atualizarConexao);
window.addEventListener("offline", atualizarConexao);

// ---------- Alarme de "Hora de sair" ----------
function verificarAlarmes() {
  const { compromissos, agora } = obterEstado();
  compromissos
    .filter((c) => !c.concluido && !c.alarmeDisparado && agora >= c.saida && agora < c.dataHora)
    .forEach((c) => {
      const texto = `Seu compromisso "${c.titulo}" é logo mais. Saia agora!`;
      notificar("⏰ Hora de sair!", texto);
      ui.toast(`⏰ Hora de sair! ${texto}`, "aviso", 20000);
      marcarAlarmeDisparado(c.id);
    });
}

function tique() {
  atualizarEstado({ agora: Date.now() });
  verificarAlarmes();
}
setInterval(tique, 15000);

// ---------- Service Worker ----------
async function mostrarStatusOffline(texto) {
  const alvo = $("#status-sw");
  if (alvo) alvo.textContent = texto;
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    mostrarStatusOffline("Este navegador não suporta Service Worker: o modo offline não está disponível.");
    return;
  }
  try {
    const jaTinhaControle = Boolean(navigator.serviceWorker.controller);
    const registro = await navigator.serviceWorker.register("service-worker.js");
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (jaTinhaControle) ui.toast("Aplicativo atualizado. Recarregue a página para usar a nova versão.", "aviso", 10000);
    });
    await navigator.serviceWorker.ready;
    const chaves = await caches.keys();
    mostrarStatusOffline(`Modo offline pronto ✔ (caches: ${chaves.join(", ") || "—"})`);
    registro.addEventListener("updatefound", () => mostrarStatusOffline("Baixando nova versão para uso offline…"));
  } catch (erro) {
    console.warn("Service Worker não registrado:", erro);
    mostrarStatusOffline("Não foi possível ativar o modo offline (abra via http://localhost ou HTTPS).");
  }
}

// ---------- Inicialização ----------
const erroArmazenamento = iniciarCompromissos();
ui.renderConexao(navigator.onLine);
ui.resetarFormulario(null);
$("#preparoMin").value = CONFIG_PADRAO.preparoPadraoMin;
atualizarEstado({ config: CONFIG_PADRAO });
ui.preencherSelects(CONFIG_PADRAO);
renderTrajeto();
renderTudo();
iniciarNavegacao((rota) => { if (rota === "novo") iniciarMapaSeNecessario(); });
carregarConfig();
registrarServiceWorker();
verificarAlarmes();

if (erroArmazenamento === "invalido")
  ui.toast("Os dados salvos estavam corrompidos e foram ignorados (cópia guardada).", "erro", 9000);
else if (erroArmazenamento === "indisponivel")
  ui.toast("Armazenamento local indisponível: os compromissos não serão salvos.", "erro", 9000);
