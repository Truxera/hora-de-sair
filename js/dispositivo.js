// Recursos do dispositivo/navegador: geolocalização, notificações e compartilhamento.
// Todos têm alternativa quando o recurso não existe ou a permissão é negada.

/**
 * Obtém a posição atual. Rejeita com {codigo, mensagem} amigável.
 * codigos: nao-suportado | negado | indisponivel | tempo-esgotado
 */
export function obterPosicao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ codigo: "nao-suportado", mensagem: "Este navegador não oferece geolocalização. Marque a origem no mapa." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisao: pos.coords.accuracy }),
      (err) => {
        const mapa = {
          1: ["negado", "Permissão de localização negada. Sem problema: marque a origem no mapa."],
          2: ["indisponivel", "Não foi possível determinar sua posição agora. Marque a origem no mapa."],
          3: ["tempo-esgotado", "A localização demorou demais. Tente de novo ou marque a origem no mapa."],
        };
        const [codigo, mensagem] = mapa[err.code] ?? mapa[2];
        reject({ codigo, mensagem });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export const notificacaoSuportada = () => "Notification" in window;

/** Pede permissão de notificação (só em resposta a um clique do usuário). */
export async function pedirPermissaoNotificacao() {
  if (!notificacaoSuportada()) return "nao-suportado";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notificar(titulo, corpo) {
  if (!notificacaoSuportada() || Notification.permission !== "granted") return false;
  try {
    new Notification(titulo, { body: corpo, icon: "assets/imagens/icone.svg" });
    return true;
  } catch {
    return false; // alguns navegadores móveis exigem notificação via Service Worker
  }
}

/** Compartilha (Web Share) ou copia para a área de transferência. */
export async function compartilharTexto(texto) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Hora de Sair", text: texto });
      return "compartilhado";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelado";
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return "copiado";
    } catch { /* cai para indisponível */ }
  }
  return "indisponivel";
}
