// ============================================================
// CONFIG
// ============================================================
const SHEET_ID = "1hAzsPEoartooj6i-9aq-aAu5xFzOKkBiuUwnao0-JnI";
const GID_CONSULTORES = "1717862999";
const GID_LOJAS = "0";

// ============================================================
// FETCH PLANILHA
// ============================================================
async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));

  // Monta colunas a partir dos labels
  const cols = json.table.cols.map((c) => c.label || "");

  const rows = json.table.rows
    .map((row) => {
      const obj = {};
      row.c.forEach((cell, idx) => {
        const key = cols[idx] || `col${idx}`;
        if (!cell) { obj[key] = ""; return; }
        // Sempre usa cell.v (valor bruto) — para % o Google retorna 0.9142, 1.1665 etc.
        obj[key] = cell.v !== null && cell.v !== undefined ? cell.v : "";
        // Guarda formatado como fallback para exibição
        if (cell.f) obj[`_f_${key}`] = cell.f;
      });
      return obj;
    })
    .filter((row) => Object.values(row).some(v => v !== "" && v !== null));

  console.log(`[Sheet gid=${gid}] ${rows.length} linhas`, rows);
  return rows;
}

// Converte percentual para decimal — Google Sheets já entrega como decimal (0.9142, 1.1665)
// Mas aceita strings também como fallback ("91,42%" → 0.9142)
function toDecimal(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!isNaN(n)) return n; // já é decimal: 0.9142 ou 1.1665
  // fallback string: "91,42%" ou "91.42%"
  const str = String(value).replace("%", "").replace(",", ".").trim();
  const parsed = parseFloat(str);
  if (!isNaN(parsed)) return parsed > 1 ? parsed / 100 : parsed;
  return 0;
}

// ============================================================
// HELPERS
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
  if (value === "" || value === null || value === undefined) return "-";
  const d = toDecimal(value);
  if (isNaN(d)) return "-";
  return (d * 100).toFixed(1).replace(".", ",") + "%";
}

// Debug: loga os dados brutos no console para diagnóstico
function debugData(label, data) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]).filter(k => !k.startsWith("_fmt_"));
  console.group(`[Idealize] ${label} (${data.length} linhas)`);
  data.forEach((row, i) => {
    const vals = keys.map(k => `${k}: ${row[k]}`).join(" | ");
    console.log(`${i+1}. ${vals}`);
  });
  console.groupEnd();
}

// Converte link do Google Drive para URL direta de imagem
function normalizePhotoUrl(url) {
  if (!url) return "";
  // Formato: https://drive.google.com/file/d/ID/view → direto
  const driveMatch = url.match(/\/file\/d\/([\w-]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  // Formato: ?id=ID
  const idMatch = url.match(/[?&]id=([\w-]+)/);
  if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  // URL direta (outro serviço)
  return url;
}

// Chave da planilha para buscar foto do consultor por nome
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

  // Ordem visual: 2º | 1º | 3º
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

  console.log(`[Consultores] percentKey="${percentKey}" nomeKey="${nomeKey}"`);
  console.log(`[Consultores] valores %:`, data.map(r => ({ nome: r[nomeKey], pct: r[percentKey], dec: toDecimal(r[percentKey]) })));

  // Popula o mapa de fotos por nome
  if (fotoKey) {
    data.forEach((row) => {
      const nome = String(row[nomeKey] || "").trim().toLowerCase();
      const foto = normalizePhotoUrl(String(row[fotoKey] || "").trim());
      if (nome && foto) _photoMap[nome] = foto;
    });
  }

  const sorted = [...data].sort((a, b) => toDecimal(b[percentKey]) - toDecimal(a[percentKey]));

  // Top 3 vai pro pódio
  const top3 = sorted.slice(0, 3);
  renderPodium(top3);

  // 4º em diante ficam nos cards
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
// ADMIN MODAL
// ============================================================
function initAdmin() {
  const overlay = document.getElementById("modalOverlay");
  const btnAdmin = document.getElementById("btnAdmin");
  const btnClose = document.getElementById("modalClose");

  btnAdmin.addEventListener("click", () => {
    overlay.classList.add("open");
  });

  btnClose.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  // Copiar URL webhook
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

  // Simular webhook
  const btnSim = document.getElementById("btnSimulate");
  if (btnSim) btnSim.addEventListener("click", simulateWebhook);
}

// ============================================================
// SIMULAÇÃO WEBHOOK
// ============================================================
function simulateWebhook() {
  const log = document.getElementById("webhookLog");
  const names = ["Ana Lima", "Carlos Souza", "Maria Oliveira", "João Pedro"];
  const stores = ["Loja Centro", "Loja Santos", "Loja Cubatão"];
  const name = names[Math.floor(Math.random() * names.length)];
  const store = stores[Math.floor(Math.random() * stores.length)];
  const value = (Math.random() * 2000 + 200).toFixed(2);
  const now = new Date().toLocaleTimeString("pt-BR");

  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">${now}</span> <strong>${name}</strong> (${store}) — R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const empty = log.querySelector(".log-empty");
  if (empty) empty.remove();

  log.prepend(entry);

  // Máximo 8 entradas
  while (log.children.length > 8) log.removeChild(log.lastChild);
}

// ============================================================
// INIT
// ============================================================
async function init() {
  initAdmin();

  try {
    const [consultores, lojas] = await Promise.all([
      fetchSheet(GID_CONSULTORES),
      fetchSheet(GID_LOJAS),
    ]);

    if (consultores && consultores.length) {
      debugData("CONSULTORES", consultores);
      renderConsultores(consultores);
    }
    if (lojas && lojas.length) {
      debugData("LOJAS", lojas);
      renderLojas(lojas);
    }

    // Atualiza a cada 5 minutos
    setInterval(async () => {
      const [c, l] = await Promise.all([
        fetchSheet(GID_CONSULTORES),
        fetchSheet(GID_LOJAS),
      ]);
      if (c && c.length) renderConsultores(c);
      if (l && l.length) renderLojas(l);
    }, 5 * 60 * 1000);

  } catch (e) {
    console.error(e);
    alert("Erro ao carregar dados do ranking. Confira se a planilha está pública.");
  }
}

document.addEventListener("DOMContentLoaded", init);
