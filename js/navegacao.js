// Roteamento por hash (#/inicio, #/novo, #/compromissos, #/sobre).
// Só a tela da rota atual fica visível; URL, conteúdo e menu ativo ficam sincronizados.

export const ROTAS = {
  inicio: { titulo: "Início" },
  novo: { titulo: "Novo compromisso" },
  compromissos: { titulo: "Meus compromissos" },
  sobre: { titulo: "Sobre o projeto" },
};
const ROTA_PADRAO = "inicio";

export function rotaAtual() {
  const nome = location.hash.replace(/^#\/?/, "").split("?")[0];
  return nome in ROTAS ? nome : ROTA_PADRAO;
}

function aplicarRota(aoMudar, focar) {
  const rota = rotaAtual();

  document.querySelectorAll("[data-tela]").forEach((tela) => {
    tela.hidden = tela.dataset.tela !== rota;
  });
  document.querySelectorAll("[data-rota]").forEach((link) => {
    const ativo = link.dataset.rota === rota;
    link.classList.toggle("ativo", ativo);
    if (ativo) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.title = `${ROTAS[rota].titulo} · Hora de Sair`;

  // URL inválida ("#/xyz" ou vazia) é corrigida para a rota padrão
  if (location.hash !== `#/${rota}`) {
    history.replaceState(null, "", `#/${rota}`);
  }

  if (focar) document.getElementById("conteudo")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
  aoMudar?.(rota);
}

export function iniciarNavegacao(aoMudar) {
  window.addEventListener("hashchange", () => aplicarRota(aoMudar, true));
  aplicarRota(aoMudar, false);
}

export function irPara(rota) {
  location.hash = `#/${rota in ROTAS ? rota : ROTA_PADRAO}`;
}
