// Camada de interface: tudo que mexe no DOM.
// Textos digitados pelo usuário entram SEMPRE via textContent (nunca innerHTML) — evita XSS.
import { formatarData, formatarDuracao, formatarHora } from "./calculo.js";

const $ = (seletor) => document.querySelector(seletor);

/** Cria elemento: el("p", {class:"x", text:"oi"}, filhos...) */
function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || valor === false) continue;
    if (chave === "text") no.textContent = valor;
    else if (chave === "class") no.className = valor;
    else if (chave === "dataset") Object.assign(no.dataset, valor);
    else no.setAttribute(chave, valor === true ? "" : valor);
  }
  filhos.flat().forEach((f) => f != null && no.append(f));
  return no;
}

// ---------- Tema ----------
export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  const botao = $("#btn-tema");
  if (botao) {
    botao.textContent = tema === "escuro" ? "☀️ Tema claro" : "🌙 Tema escuro";
    botao.setAttribute("aria-pressed", String(tema === "escuro"));
  }
}

// ---------- Conexão ----------
export function renderConexao(online) {
  const bloco = $("#status-conexao");
  bloco.textContent = online ? "🌐 Online" : "⚠️ Offline — usando dados salvos no aparelho";
  bloco.classList.toggle("offline", !online);
  const aviso = $("#aviso-mapa");
  if (aviso) {
    aviso.hidden = online;
    aviso.textContent =
      "Sem conexão: o fundo do mapa e a busca podem não aparecer, mas você ainda pode marcar origem e destino clicando na área do mapa.";
  }
}

// ---------- Toasts (feedback não bloqueante) ----------
export function toast(mensagem, tipo = "sucesso", duracaoMs = 4500) {
  const area = $("#toasts");
  const no = el("div", { class: `toast ${tipo}`, role: tipo === "erro" ? "alert" : "status", text: mensagem });
  area.append(no);
  setTimeout(() => no.remove(), duracaoMs);
}

// ---------- Dados carregados por fetch ----------
export function renderConfigStatus(status, mensagem = "") {
  const bloco = $("#config-status");
  const botao = $("#btn-recarregar-config");
  bloco.className = `aviso config ${status}`;
  if (status === "carregando") bloco.textContent = "Carregando categorias e meios de transporte…";
  else if (status === "ok") bloco.textContent = "";
  else bloco.textContent = mensagem || "Não foi possível carregar data/dados.json. Usando valores padrão.";
  bloco.hidden = status === "ok";
  botao.hidden = status !== "erro";
}

export function preencherSelects(config) {
  const categoria = $("#categoria");
  const transporte = $("#transporte");
  const catAtual = categoria.value;
  const trAtual = transporte.value;
  categoria.replaceChildren(
    el("option", { value: "", text: "Selecione…" }),
    ...config.categorias.map((c) => el("option", { value: c.id, text: c.nome }))
  );
  transporte.replaceChildren(
    el("option", { value: "", text: "Selecione…" }),
    ...config.transportes.map((t) => el("option", { value: t.id, text: `${t.nome} (~${t.velocidadeKmH} km/h)` }))
  );
  categoria.value = catAtual;
  transporte.value = trAtual || (config.transportes[0]?.id ?? "");
}

// ---------- Formulário: erros e trajeto ----------
const CAMPOS = ["titulo", "categoria", "data", "horario", "transporte", "preparoMin", "origem", "destino"];
const FOCO = { origem: "#btn-gps", destino: "#btn-modo-destino" };

export function limparErros() {
  CAMPOS.forEach((campo) => {
    const msg = $(`#erro-${campo}`);
    if (msg) { msg.textContent = ""; msg.hidden = true; }
    const campoEl = document.getElementById(campo);
    campoEl?.removeAttribute("aria-invalid");
  });
}

export function limparErro(campo) {
  const msg = $(`#erro-${campo}`);
  if (msg) { msg.textContent = ""; msg.hidden = true; }
  document.getElementById(campo)?.removeAttribute("aria-invalid");
}

export function mostrarErros(erros) {
  limparErros();
  let primeiro = null;
  CAMPOS.forEach((campo) => {
    if (!erros[campo]) return;
    const msg = $(`#erro-${campo}`);
    msg.textContent = erros[campo];
    msg.hidden = false;
    document.getElementById(campo)?.setAttribute("aria-invalid", "true");
    primeiro ??= campo;
  });
  if (primeiro) $(FOCO[primeiro] ?? `#${primeiro}`)?.focus();
}

export function renderTrajeto({ origem, destino, destinoNome, modo }) {
  $("#txt-origem").textContent = origem
    ? `Origem: ${origem.lat.toFixed(4)}, ${origem.lng.toFixed(4)}`
    : "Origem ainda não definida.";
  $("#txt-destino").textContent = destino
    ? `Destino: ${destinoNome || "ponto no mapa"} (${destino.lat.toFixed(4)}, ${destino.lng.toFixed(4)})`
    : "Destino ainda não definido.";
  $("#btn-modo-origem").setAttribute("aria-pressed", String(modo === "origem"));
  $("#btn-modo-destino").setAttribute("aria-pressed", String(modo === "destino"));
}

export function renderPrevia(previa) {
  const bloco = $("#previa");
  if (!previa) { bloco.hidden = true; return; }
  bloco.hidden = false;
  bloco.textContent =
    `Prévia: ${previa.distancia.toFixed(1)} km em linha reta, ~${formatarDuracao(previa.viagem)} de trajeto ` +
    `+ ${formatarDuracao(previa.preparo)} de preparo → saia às ${formatarHora(previa.saida)} do dia ${formatarData(previa.saida)}.`;
}

export function setGpsOcupado(ocupado) {
  const botao = $("#btn-gps");
  botao.disabled = ocupado;
  botao.setAttribute("aria-busy", String(ocupado));
  botao.textContent = ocupado ? "Obtendo localização…" : "📍 Usar minha localização (GPS)";
}

export function resetarFormulario(config) {
  $("#form-compromisso").reset();
  limparErros();
  $("#preparoMin").value = config?.preparoPadraoMin ?? 10;
  if (config) $("#transporte").value = config.transportes[0]?.id ?? "";
}

// ---------- Lista ----------
const ROTULOS = {
  concluido: ["Concluído", "ok"],
  futuro: ["Agendado", "info"],
  "hora-de-sair": ["Hora de sair!", "alerta"],
  expirado: ["Passou do horário", "neutro"],
};

function textoSaida(c, sit, agora) {
  if (sit === "concluido") return "Compromisso concluído.";
  if (sit === "expirado") return "O horário do compromisso já passou.";
  if (sit === "hora-de-sair") return `Saia agora! (previsto para ${formatarHora(c.saida)})`;
  return `Sair às ${formatarHora(c.saida)} — faltam ${formatarDuracao((c.saida - agora) / 60000)}`;
}

export function linkRota(c) {
  const p = new URLSearchParams({
    api: "1",
    origin: `${c.origem.lat},${c.origem.lng}`,
    destination: `${c.destino.lat},${c.destino.lng}`,
  });
  return `https://www.google.com/maps/dir/?${p}`;
}

export function textoCompartilhar(c) {
  return `${c.titulo} — ${formatarData(c.dataHora)} às ${formatarHora(c.dataHora)}. Sair às ${formatarHora(c.saida)}.`;
}

export function renderLista({ itens, agora, config, situacao, totalGeral }) {
  const lista = $("#lista-compromissos");
  const vazio = $("#lista-vazia");
  const nomeCat = (id) => config.categorias.find((c) => c.id === id)?.nome ?? "Outro";
  const nomeTr = (id) => config.transportes.find((t) => t.id === id)?.nome.toLowerCase() ?? "";

  vazio.hidden = itens.length > 0;
  vazio.textContent =
    totalGeral === 0
      ? "Nenhum compromisso ainda. Cadastre o primeiro em “Novo”."
      : "Nenhum compromisso corresponde ao filtro.";
  $("#btn-apagar-todos").disabled = totalGeral === 0;

  lista.replaceChildren(
    ...itens.map((c) => {
      const sit = situacao(c, agora);
      const [rotulo, classe] = ROTULOS[sit];
      return el(
        "li",
        { class: `cartao sit-${sit}` },
        el("div", { class: "cartao-topo" },
          el("h3", { text: c.titulo }),
          el("span", { class: `selo ${classe}`, text: rotulo })
        ),
        el("p", { text: `📅 ${formatarData(c.dataHora)} às ${formatarHora(c.dataHora)} · ${nomeCat(c.categoria)}` }),
        el("p", { text: `📍 ${c.destino.nome || "Destino marcado no mapa"}` }),
        el("p", { class: "detalhe", text:
          `Trajeto: ${c.distanciaKm.toFixed(1)} km em linha reta, ~${formatarDuracao(c.minutosViagem)} de ${nomeTr(c.transporte)} + ${formatarDuracao(c.preparoMin)} de preparo (estimativa)` }),
        el("p", { class: "saida", text: `⏰ ${textoSaida(c, sit, agora)}` }),
        el("div", { class: "acoes" },
          el("button", { type: "button", class: "btn secundario", dataset: { acao: "concluir", id: c.id },
            text: c.concluido ? "↩️ Reabrir" : "✅ Concluir" }),
          el("button", { type: "button", class: "btn secundario", dataset: { acao: "compartilhar", id: c.id }, text: "📤 Compartilhar" }),
          el("a", { class: "btn secundario", href: linkRota(c), target: "_blank", rel: "noopener noreferrer", text: "🗺️ Rota" }),
          el("button", { type: "button", class: "btn perigo", dataset: { acao: "excluir", id: c.id }, text: "🗑️ Excluir" })
        )
      );
    })
  );
}

// ---------- Início ----------
export function renderInicio({ proximo, total, pendentes, config, agora }) {
  $("#resumo-total").textContent = String(total);
  $("#resumo-pendentes").textContent = String(pendentes);
  const bloco = $("#proximo");
  if (!proximo) {
    bloco.replaceChildren(el("p", { text: "Você não tem compromissos futuros pendentes." }));
    return;
  }
  const nomeCat = config.categorias.find((c) => c.id === proximo.categoria)?.nome ?? "Outro";
  bloco.replaceChildren(
    el("h3", { text: proximo.titulo }),
    el("p", { text: `📅 ${formatarData(proximo.dataHora)} às ${formatarHora(proximo.dataHora)} · ${nomeCat}` }),
    el("p", { class: "saida", text: `⏰ ${textoSaida(proximo, situacaoSimples(proximo, agora), agora)}` })
  );
}

function situacaoSimples(c, agora) {
  if (agora >= c.dataHora) return "expirado";
  if (agora >= c.saida) return "hora-de-sair";
  return "futuro";
}
