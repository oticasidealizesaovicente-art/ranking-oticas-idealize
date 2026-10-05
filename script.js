// ============================================================
// CONFIG — fonte de dados: Sistema de Metas (Supabase)
// Antes: planilha do Google Sheets. Agora o ranking vem direto
// do metas.oticasidealize.online, em tempo real.
// ============================================================
const SB_URL = "https://xmkzotgwycvobeqsdpno.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3pvdGd3eWN2b2JlcXNkcG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDU5OTksImV4cCI6MjA5MzkyMTk5OX0.pn7vPIKB9RWOjkTacrMj2H66CCysNM8lh9asmnokEjE";

// Fotos dos consultores (opcional).
// A chave e o nome em minusculas; o valor, a URL da imagem.
// Enquanto estiver vazio, aparece a inicial do nome no lugar.
const FOTOS = {
  // "gabriel": "https://res.cloudinary.com/.../gabriel.jpg",
};

// ============================================================
// FETCH — API do Supabase
// ============================================================
async function sb(view) {
  const res = await fetch(`${SB_URL}/rest/v1/${view}?select=*`, {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
  });
  if (!res.ok) throw new Error(`Supabase ${view}: ${res.status}`);
  return res.json();
}

// Converte o retorno em linhas no mesmo formato que a planilha entregava,
// para que o restante da pagina continue funcionando sem alteracao.
async function fetchConsultores() {
  const rows = await sb("v_ranking_publico");
  return rows.map((r) => ({
    Consultor: r.nome || "",
    Loja: r.loja || "",
    "% Entrega": Number(r.pct_meta || 0) / 100,  // 19.59 -> 0.1959
    Status: "",
    Foto: r.foto || FOTOS[String(r.nome || "").trim().toLowerCase()] || "",
    Vendas: r.vendas || 0,
    Pontos: r.pontos_avaliacao || 0,
  }));
}

async function fetchLojas() {
  const rows = await sb("v_ranking_lojas_publico");
  return rows.map((r) => ({
    Loja: r.loja || "",
    "% Entrega": Number(r.pct_meta || 0) / 100,
    Status: "",
    Foto: "",
    Vendas: r.vendas || 0,
  }));
}

// ============================================================
// HELPERS
// ============================================================
function toDecimal(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!isNaN(n)) return n;
  const str = String(value).replace("%", "").replace(",", ".").trim();
  const parsed = parseFloat(str);
  if (!isNaN(parsed)) return parsed > 1 ? parsed / 100 : parsed;
  return 0;
}

function getPositionClass(index) {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";
  return "";
}

function getPosLabel(index) {
  if (index === 0) return "🥇 1º";
  if (index === 1) return "🥈 2º";
  if (index === 2) return "🥉 3º";
  return `${index + 1}º`;
}

function formatPercent(value) {
  if (value === "" || value === null || value === undefined) return "-";
  const d = toDecimal(value);
  if (isNaN(d)) return "-";
  return (d * 100).toFixed(1).replace(".", ",") + "%";
}

function normalizePhotoUrl(url) {
  if (!url) return "";
  const driveMatch = url.match(/\/file\/d\/([\w-]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  const idMatch = url.match(/[?&]id=([\w-]+)/);
  if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  return url;
}

// Minimo de pontos para o bonus: metade das vendas
function pontosMinimos(vendas) {
  return Math.ceil(Number(vendas || 0) * 0.5);
}

const _photoMap = {};

function getPhotoByName(nome) {
  return _photoMap[nome?.trim?.().toLowerCase()] || "";
}

// ============================================================
// PÓDIO TOP 3
// ============================================================
function renderPodium(top3) {
  const podium = document.getElementById("podium");
  podium.innerHTML = "";

  const visualOrder = [1, 0, 2];

  visualOrder.forEach((dataIdx) => {
    const row = top3[dataIdx];
    if (!row) return;

    const rowKeys = Object.keys(row).filter(k => !k.startsWith("_f_"));
    const posClass = getPositionClass(dataIdx);
    const nomeKey = rowKeys.find((k) => k.toLowerCase().includes("consultor")) || rowKeys[0];
    const lojaKey = rowKeys.find((k) => k.toLowerCase().includes("loja")) || "";
    const percentKey = rowKeys.find((k) => k.toLowerCase().includes("% entrega")) ||
                       rowKeys.find((k) => k.toLowerCase().includes("%")) ||
                       rowKeys.find((k) => k.toLowerCase().includes("entrega")) || rowKeys[2];

    const photo = getPhotoByName(row[nomeKey]);
    const heightClass = dataIdx === 0 ? "podium-first" : dataIdx === 1 ? "podium-second" : "podium-third";
    const pct = toDecimal(row[percentKey]);
    const superMeta = pct >= 1;
    const pontos = Number(row.Pontos || 0);
    const minPts = pontosMinimos(row.Vendas);
    const ptsOk = pontos >= minPts;

    const item = document.createElement("div");
    item.className = `podium-item ${posClass} ${heightClass}`;
    item.style.animationDelay = `${dataIdx * 0.1}s`;

    item.innerHTML = `
      <div class="podium-avatar-wrap">
        ${photo
          ? `<img class="podium-avatar" src="${photo}" alt="${row[nomeKey]}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="podium-avatar-placeholder" style="display:none">${(row[nomeKey] || "?")[0].toUpperCase()}</div>`
          : `<div class="podium-avatar-placeholder">${(row[nomeKey] || "?")[0].toUpperCase()}</div>`
        }
        <div class="podium-rank ${posClass}">${dataIdx === 0 ? "1º" : dataIdx === 1 ? "2º" : "3º"}</div>
      </div>
      <div class="podium-name">${row[nomeKey] || "-"}</div>
      <div class="podium-store">${row[lojaKey] || ""}</div>
      <div class="podium-pct ${superMeta ? "pct-super" : ""}">${formatPercent(row[percentKey])}</div>
      <div class="podium-pontos ${ptsOk ? "pts-ok" : "pts-bad"}">⭐ ${pontos} ${pontos === 1 ? "ponto" : "pontos"}</div>
      ${superMeta ? `<div class="super-meta-badge">🔥 SUPER META</div>` : ""}
      <div class="podium-base ${posClass}" data-pos="${dataIdx === 0 ? '1º' : dataIdx === 1 ? '2º' : '3º'}"></div>
    `;

    podium.appendChild(item);
  });
}

// ============================================================
// CONSULTORES (4º em diante)
// ============================================================
function renderConsultores(data) {
  const container = document.getElementById("consultores-list");
  container.innerHTML = "";

  const keys = Object.keys(data[0]).filter(k => !k.startsWith("_f_"));
  const percentKey =
    keys.find((k) => k.toLowerCase().includes("% entrega")) ||
    keys.find((k) => k.toLowerCase().includes("%")) ||
    keys.find((k) => k.toLowerCase().includes("entrega")) || "col4";
  const nomeKey = keys.find((k) => k.toLowerCase().includes("consultor")) || "col0";
  const lojaKey = keys.find((k) => k.toLowerCase().includes("loja")) || "col1";
  const statusKey = keys.find((k) => k.toLowerCase().includes("status")) || "col5";
  const fotoKey = keys.find((k) => k.toLowerCase().includes("foto")) || "";

  if (fotoKey) {
    data.forEach((row) => {
      const nome = String(row[nomeKey] || "").trim().toLowerCase();
      const foto = normalizePhotoUrl(String(row[fotoKey] || "").trim());
      if (nome && foto) _photoMap[nome] = foto;
    });
  }

  const sorted = [...data].sort((a, b) => toDecimal(b[percentKey]) - toDecimal(a[percentKey]));
  const top3 = sorted.slice(0, 3);
  renderPodium(top3);

  const rest = sorted.slice(3);
  if (rest.length === 0) {
    container.innerHTML = `<p class="rest-empty">Apenas os 3 primeiros colocados este período.</p>`;
    return;
  }

  rest.forEach((row, idx) => {
    const realIdx = idx + 3;
    const percent = toDecimal(row[percentKey]);
    const superMeta = percent >= 1;
    const status = String(row[statusKey] || "").replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[🔴🟢🟡⚪🔥]/g, "").trim().toLowerCase();
    const photo = getPhotoByName(row[nomeKey]);
    const inicial = (row[nomeKey] || "?")[0].toUpperCase();
    const pontos = Number(row.Pontos || 0);
    const minPts = pontosMinimos(row.Vendas);
    const ptsOk = pontos >= minPts;

    const card = document.createElement("article");
    card.className = `card ${superMeta ? "card-super" : ""}`;
    card.style.animationDelay = `${idx * 0.05}s`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-header-left">
          ${photo
            ? `<img class="card-avatar" src="${photo}" alt="${row[nomeKey]}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-avatar-placeholder" style="display:none">${inicial}</div>`
            : `<div class="card-avatar-placeholder">${inicial}</div>`
          }
          <div>
            <div class="card-title">${row[nomeKey] || "-"}</div>
            <div class="card-subtitle">${row[lojaKey] || ""}</div>
          </div>
        </div>
        <div class="badge-pos">${realIdx + 1}º</div>
      </div>
      <div class="meta-row">
        <span>Entrega:</span>
        <span><strong class="${superMeta ? "pct-super" : ""}">${formatPercent(row[percentKey])}</strong></span>
      </div>
      <div class="meta-row meta-row-pontos">
        <span>Pontos de avaliação:</span>
        <span><strong class="${ptsOk ? "pts-ok" : "pts-bad"}">⭐ ${pontos}</strong></span>
      </div>
      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${superMeta ? "bar-super" : ""}" style="width:${Math.min(100, percent * 100)}%;"></div>
        </div>
      </div>
      <div class="status-chip ${superMeta ? "status-super" : percent >= 1 ? "status-ok" : "status-bad"}">
        ${superMeta ? "🔥 " : ""}${status || (superMeta ? "super meta!" : percent >= 1 ? "bateu a meta" : "não bateu")}
      </div>
    `;

    container.appendChild(card);
  });
}

// ============================================================
// LOJAS
// ============================================================
function renderLojas(data) {
  const container = document.getElementById("lojas-list");
  container.innerHTML = "";

  const keys = Object.keys(data[0]).filter(k => !k.startsWith("_f_"));
  const percentKey =
    keys.find((k) => k.toLowerCase().includes("% entrega")) ||
    keys.find((k) => k.toLowerCase().includes("%")) ||
    keys.find((k) => k.toLowerCase().includes("entrega")) || "col3";
  const lojaKey = keys.find((k) => k.toLowerCase().includes("loja")) || "col0";
  const statusKey = keys.find((k) => k.toLowerCase().includes("status")) || "col4";
  const fotoKey = keys.find((k) => k.toLowerCase().includes("foto")) || "";

  const sorted = [...data].sort((a, b) => toDecimal(b[percentKey]) - toDecimal(a[percentKey]));

  sorted.forEach((row, idx) => {
    const posClass = getPositionClass(idx);
    const posLabel = getPosLabel(idx);
    const percent = toDecimal(row[percentKey]);
    const superMeta = percent >= 1;
    const status = String(row[statusKey] || "").replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[🔴🟢🟡⚪🔥]/g, "").trim().toLowerCase();
    const foto = fotoKey ? normalizePhotoUrl(String(row[fotoKey] || "").trim()) : "";
    const inicial = (row[lojaKey] || "?")[0].toUpperCase();

    const card = document.createElement("article");
    card.className = `card ${posClass} ${superMeta ? "card-super" : ""}`;
    card.style.animationDelay = `${idx * 0.05}s`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-header-left">
          ${foto
            ? `<img class="card-avatar loja-avatar" src="${foto}" alt="${row[lojaKey]}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-avatar-placeholder" style="display:none">${inicial}</div>`
            : `<div class="card-avatar-placeholder">${inicial}</div>`
          }
          <div class="card-title">${row[lojaKey] || "-"}</div>
        </div>
        <div class="badge-pos ${posClass}">${posLabel}</div>
      </div>
      <div class="meta-row">
        <span>Entrega:</span>
        <span><strong class="${superMeta ? "pct-super" : ""}">${formatPercent(row[percentKey])}</strong></span>
      </div>
      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${superMeta ? "bar-super" : ""}" style="width:${Math.min(100, Math.max(0, percent * 100))}%;"></div>
        </div>
      </div>
      <div class="status-chip ${superMeta ? "status-super" : percent >= 1 ? "status-ok" : "status-bad"}">
        ${superMeta ? "🔥 " : ""}${status || (superMeta ? "super meta!" : percent >= 1 ? "meta batida" : "abaixo da meta")}
      </div>
    `;

    container.appendChild(card);
  });
}

// ============================================================
// ESTILO DOS PONTOS (injetado aqui para nao alterar o style.css)
// ============================================================
function injetarEstiloPontos() {
  if (document.getElementById("estilo-pontos")) return;
  const st = document.createElement("style");
  st.id = "estilo-pontos";
  st.textContent = `
    .podium-pontos{
      margin-top:4px; font-size:12px; font-weight:700;
      padding:3px 10px; border-radius:99px; display:inline-block;
    }
    .podium-pontos.pts-ok { color:#0d7a5c; background:rgba(13,158,117,.16); }
    .podium-pontos.pts-bad{ color:#b3302f; background:rgba(226,75,74,.14); }
    .meta-row-pontos{ font-size:13px; }
    .meta-row-pontos .pts-ok { color:#0d7a5c; }
    .meta-row-pontos .pts-bad{ color:#b3302f; }
  `;
  document.head.appendChild(st);
}

// ============================================================
// INIT
// ============================================================
async function carregar() {
  const [consultores, lojas] = await Promise.all([fetchConsultores(), fetchLojas()]);
  if (consultores && consultores.length) renderConsultores(consultores);
  if (lojas && lojas.length) renderLojas(lojas);
}

async function init() {
  try {
    injetarEstiloPontos();
    await carregar();
    // atualiza a cada 2 minutos (antes eram 5, com a planilha)
    setInterval(() => { carregar().catch(console.error); }, 2 * 60 * 1000);
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);
