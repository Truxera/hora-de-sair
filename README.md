# Hora de Sair — Alerta Inteligente de Deslocamento

Aplicação web mobile (PWA simples) da disciplina **Introdução ao Desenvolvimento para Dispositivos Móveis** — Prof. Romário Vitorino Ferreira — Trabalho N2.

## Integrantes
- Renan de Lima Souza — RA 2653392
- Hilion de Paula Hermsdorf — RA 2638139
- Luiz Gabriel Alves da Silva — RA 2640874

## Problema e objetivo
Pessoas se atrasam porque não somam o tempo de deslocamento e de preparo antes de um compromisso (consulta, cabeleireiro, reunião…).
**Objetivo:** cadastrar compromissos com origem e destino e calcular a hora ideal de sair, avisando o usuário quando chegar a hora — inclusive sem internet.
**Público:** estudantes, profissionais e cidadãos com rotinas pontuais.

## Funcionalidades
- 4 telas com rotas por hash: **Início** (`#/inicio`), **Novo** (`#/novo`), **Lista** (`#/compromissos`) e **Sobre** (`#/sobre`).
- Formulário com 6 campos, validação, mensagens de erro/sucesso e preservação dos dados em caso de erro.
- Origem por **GPS** ou clique no mapa; destino por busca (Nominatim) ou clique no mapa.
- Estimativa: `tempo = ceil(distância em linha reta × fator de rota ÷ velocidade do transporte)`; `saída = horário − viagem − preparo`.
- Listagem com busca, filtro por situação, **concluir/reabrir**, **excluir** (com confirmação), apagar todos, compartilhar e abrir rota no Google Maps.
- Aviso “Hora de sair!” (notificação do navegador, quando permitida, + aviso na tela).
- Dados no `localStorage` (sobrevivem ao recarregar), com tratamento de JSON inválido.
- `fetch` de `data/dados.json` (categorias, transportes, parâmetros), com estados de carregando/sucesso/erro e nova tentativa.
- **Recursos do dispositivo:** geolocalização, notificações, compartilhamento/área de transferência, detecção de conexão. Sem permissão ou sem suporte, o app continua utilizável.
- **Offline:** Service Worker + Cache API, indicador Online/Offline, tema claro/escuro, acessibilidade básica (rótulos, foco, `aria-*`, link “pular conteúdo”, contraste).

## Tecnologias
HTML5, CSS3, JavaScript (módulos ES), localStorage, Fetch API, Geolocation API, Notification API, Web Share/Clipboard, Service Worker/Cache API, [Leaflet 1.9.4](https://leafletjs.com) (BSD-2) e [Leaflet Control Geocoder 2.4.0](https://github.com/perliedman/leaflet-control-geocoder) (BSD-2), mapas © [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
As bibliotecas ficam em `lib/` (cópia local, sem `npm install`) para funcionarem offline.

## Estrutura de pastas
```
hora-de-sair/
├── index.html              # telas (seções) e menu
├── service-worker.js       # cache e versão (VERSAO)
├── manifest.webmanifest
├── css/style.css
├── data/dados.json         # lido via fetch
├── assets/imagens/icone.svg
├── js/
│   ├── app.js              # integra tudo (eventos, formulário, SW)
│   ├── navegacao.js        # rotas por hash
│   ├── estado.js           # estado central + ações
│   ├── armazenamento.js    # localStorage com tratamento de erro
│   ├── validacao.js        # regras do formulário
│   ├── calculo.js          # distância, tempo e horário de saída
│   ├── interface.js        # renderização / DOM
│   ├── mapa.js             # Leaflet
│   └── dispositivo.js      # GPS, notificações, compartilhar
├── lib/                    # Leaflet + geocoder (licenças incluídas)
```

## Responsabilidades
| Integrante | Responsável por |
|---|---|
| Renan de Lima Souza | `index.html`, `css/style.css`, responsividade, acessibilidade, tema |
| Hilion de Paula Hermsdorf | `estado.js`, `validacao.js`, `armazenamento.js`, `calculo.js`, testes |
| Luiz Gabriel Alves da Silva | `mapa.js`, `dispositivo.js`, `service-worker.js`, `manifest`, offline |
