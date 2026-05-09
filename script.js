// ============================================================
// CONFIG SUPABASE
// ============================================================
const SUPABASE_URL = "https://xmkzotgwycvobeqsdpno.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3pvdGd3eWN2b2JlcXNkcG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDU5OTksImV4cCI6MjA5MzkyMTk5OX0.pn7vPIKB9RWOjkTacrMj2H66CCysNM8lh9asmnokEjE";

// ============================================================
// FETCH SUPABASE
// ============================================================
async function fetchRankingConsultores() {
  const ciclo = new Date().toISOString().slice(0, 7); // ex: "2026-05"
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_ranking_atual?ciclo=eq.${ciclo}&order=posicao.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error("Erro ao buscar consultores");
  return await res.json();
}

async function fetchRankingLojas() {
  const ciclo = new Date().toISOString().slice(0, 7);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_ranking_por_loja?ciclo=eq.${ciclo}&order=comissionado_total.desc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error("Erro ao buscar lojas");
  return await res.json();
}

// ============================================================
// HELPERS (mantidos idênticos ao original)
// ============================================================
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
  if (value === null || value === undefined) return "-";
  return (Number(value)).toFixed(1).replace(".", ",") + "%";
}

const _photoMap = {};
function getPhotoByName(nome) {
  return _photoMap[nome?.trim?.().toLowerCase()] || "";
}

function normalizePhotoUrl(url) {
  if (!url) return "";
  const driveMatch = url.match(/\/file\/d\/([\w-]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  const idMatch = url.match(/[?&]id=([\w-]+)/);
  if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  return url;
}

// ============================================================
// PÓDIO TOP 3 (lógica idêntica ao original)
// ============================================================
function renderPodium(top3) {
  const podium = document.getElementById("podium");
  podium.innerHTML = "";
  const visualOrder = [1, 0, 2];

  visualOrder.forEach((dataIdx) => {
    const row = top3[dataIdx];
    if (!row) return;

    const posClass = getPositionClass(dataIdx);
    const heightClass = dataIdx === 0 ? "podium-first" : dataIdx === 1 ? "podium-second" : "podium-third";
    const pct = Number(row.pct_meta || 0);
    const superMeta = pct >= 100;
    const photo = getPhotoByName(row.nome);

    const item = document.createElement("div");
    item.className = `podium-item ${posClass} ${heightClass}`;
    item.style.animationDelay = `${dataIdx * 0.1}s`;

    item.innerHTML = `
      <div class="podium-avatar-wrap">
        ${photo
          ? `<img class="podium-avatar" src="${photo}" alt="${row.nome}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="podium-avatar-placeholder" style="display:none">${(row.nome || "?")[0].toUpperCase()}</div>`
          : `<div class="podium-avatar-placeholder">${(row.nome || "?")[0].toUpperCase()}</div>`
        }
        <div class="podium-rank ${posClass}">${dataIdx === 0 ? "1º" : dataIdx === 1 ? "2º" : "3º"}</div>
      </div>
      <div class="podium-name">${row.nome || "-"}</div>
      <div class="podium-store">${row.loja || ""}</div>
      <div class="podium-pct ${superMeta ? "pct-super" : ""}">${formatPercent(pct)}</div>
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

  const top3 = data.slice(0, 3);
  renderPodium(top3);

  const rest = data.slice(3);
  if (rest.length === 0) {
    container.innerHTML = `<p class="rest-empty">Apenas os 3 primeiros colocados este período.</p>`;
    return;
  }

  rest.forEach((row, idx) => {
    const realIdx = idx + 3;
    const pct = Number(row.pct_meta || 0);
    const superMeta = pct >= 100;
    const photo = getPhotoByName(row.nome);
    const inicial = (row.nome || "?")[0].toUpperCase();

    const card = document.createElement("article");
    card.className = `card ${superMeta ? "card-super" : ""}`;
    card.style.animationDelay = `${idx * 0.05}s`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-header-left">
          ${photo
            ? `<img class="card-avatar" src="${photo}" alt="${row.nome}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-avatar-placeholder" style="display:none">${inicial}</div>`
            : `<div class="card-avatar-placeholder">${inicial}</div>`
          }
          <div>
            <div class="card-title">${row.nome || "-"}</div>
            <div class="card-subtitle">${row.loja || ""}</div>
          </div>
        </div>
        <div class="badge-pos">${realIdx + 1}º</div>
      </div>
      <div class="meta-row">
        <span>Entrega:</span>
        <span><strong class="${superMeta ? "pct-super" : ""}">${formatPercent(pct)}</strong></span>
      </div>
      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${superMeta ? "bar-super" : ""}" style="width:${Math.min(100, pct)}%;"></div>
        </div>
      </div>
      <div class="meta-row" style="font-size:0.75rem;color:#888;margin-top:4px">
        <span>Fat. ${formatBRL(row.faturado)} · Comis. ${formatBRL(row.comissionado)}</span>
        <span>${row.vendas} vendas</span>
      </div>
      <div class="status-chip ${superMeta ? "status-super" : pct >= 100 ? "status-ok" : "status-bad"}">
        ${superMeta ? "🔥 super meta!" : pct >= 100 ? "bateu a meta" : "não bateu"}
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

  data.forEach((row, idx) => {
    const posClass = getPositionClass(idx);
    const posLabel = getPosLabel(idx);
    const pct = Number(row.pct_meta_medio || 0);
    const superMeta = pct >= 100;
    const inicial = (row.loja || "?")[0].toUpperCase();

    const card = document.createElement("article");
    card.className = `card ${posClass} ${superMeta ? "card-super" : ""}`;
    card.style.animationDelay = `${idx * 0.05}s`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-avatar-placeholder">${inicial}</div>
          <div class="card-title">${row.loja || "-"}</div>
        </div>
        <div class="badge-pos ${posClass}">${posLabel}</div>
      </div>
      <div class="meta-row">
        <span>Entrega:</span>
        <span><strong class="${superMeta ? "pct-super" : ""}">${formatPercent(pct)}</strong></span>
      </div>
      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${superMeta ? "bar-super" : ""}" style="width:${Math.min(100, Math.max(0, pct))}%;"></div>
        </div>
      </div>
      <div class="meta-row" style="font-size:0.75rem;color:#888;margin-top:4px">
        <span>${row.num_consultores} consultores</span>
        <span>Fat. ${formatBRL(row.faturado_total)}</span>
      </div>
      <div class="status-chip ${superMeta ? "status-super" : pct >= 100 ? "status-ok" : "status-bad"}">
        ${superMeta ? "🔥 " : ""}${superMeta ? "super meta!" : pct >= 100 ? "meta batida" : "abaixo da meta"}
      </div>
    `;

    container.appendChild(card);
  });
}

// ============================================================
// HELPERS FORMATAÇÃO
// ============================================================
function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ============================================================
// ADMIN MODAL (mantido idêntico ao original)
// ============================================================
function initAdmin() {
  const overlay = document.getElementById("modalOverlay");
  const btnAdmin = document.getElementById("btnAdmin");
  const btnClose = document.getElementById("modalClose");

  btnAdmin.addEventListener("click", () => overlay.classList.add("open"));
  btnClose.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  const btnCopy = document.getElementById("btnCopyUrl");
  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      const url = document.getElementById("webhookUrl").textContent;
      navigator.clipboard.writeText(url).then(() => {
        btnCopy.textContent = "✅ Copiado!";
        setTimeout(() => (btnCopy.textContent = "📋 Copiar"), 2000);
      });
    });
  }
}

// ============================================================
// INIT
// ============================================================
async function init() {
  initAdmin();

  try {
    const [consultores, lojas] = await Promise.all([
      fetchRankingConsultores(),
      fetchRankingLojas(),
    ]);

    if (consultores && consultores.length) renderConsultores(consultores);
    else document.getElementById("consultores-list").innerHTML = `<p class="rest-empty">Nenhum lançamento aprovado ainda neste ciclo.</p>`;

    if (lojas && lojas.length) renderLojas(lojas);

    // Atualiza a cada 5 minutos
    setInterval(async () => {
      const [c, l] = await Promise.all([
        fetchRankingConsultores(),
        fetchRankingLojas(),
      ]);
      if (c && c.length) renderConsultores(c);
      if (l && l.length) renderLojas(l);
    }, 5 * 60 * 1000);

  } catch (e) {
    console.error(e);
    document.getElementById("consultores-list").innerHTML = `<p class="rest-empty">Erro ao carregar ranking. Tente novamente.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
