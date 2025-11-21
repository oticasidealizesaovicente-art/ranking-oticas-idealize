const SHEET_ID = "1hAzsPEoartooj6i-9aq-aAu5xFzOKkBiuUwnao0-JnI";
const GID_CONSULTORES = "1717862999";
const GID_LOJAS = "0";

async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();

  const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const cols = json.table.cols.map((c) => c.label);
  const rows = json.table.rows;

  return rows.map((row) => {
    const obj = {};
    row.c.forEach((cell, idx) => {
      obj[cols[idx] || `col${idx}`] = cell ? cell.v : "";
    });
    return obj;
  });
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
  if (value === "" || value === null || value === undefined || isNaN(value)) return "-";
  return (Number(value) * 100).toFixed(1).replace(".", ",") + "%";
}

function formatMoney(value) {
  if (!value && value !== 0) return "-";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function renderConsultores(data) {
  const container = document.getElementById("consultores-list");
  container.innerHTML = "";

  const percentKey =
    Object.keys(data[0]).find((k) => k.toLowerCase().includes("%")) ||
    Object.keys(data[0]).find((k) => k.toLowerCase().includes("entrega")) ||
    "col4";

  const nomeKey = Object.keys(data[0]).find((k) => k.toLowerCase().includes("consultor")) || "col0";
  const lojaKey = Object.keys(data[0]).find((k) => k.toLowerCase().includes("loja")) || "col1";
  const statusKey = Object.keys(data[0]).find((k) => k.toLowerCase().includes("status")) || "col5";

  const sorted = [...data].sort(
    (a, b) => Number(b[percentKey] || 0) - Number(a[percentKey] || 0)
  );

  sorted.forEach((row, idx) => {
    const posClass = getPositionClass(idx);
    const posLabel = getPosLabel(idx);
    const percent = Number(row[percentKey] || 0);
    const status = String(row[statusKey] || "").toLowerCase();

    const card = document.createElement("article");
    card.className = `card ${posClass}`;

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${row[nomeKey] || "-"}</div>
          <div class="card-subtitle">${row[lojaKey] || ""}</div>
        </div>
        <div class="badge-pos ${posClass}">${posLabel}</div>
      </div>

      <div class="meta-row">
        <span>Entrega:</span>
        <span><strong>${formatPercent(row[percentKey])}</strong></span>
      </div>

      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${Math.min(
            140,
            Math.max(0, percent * 100)
          )}%;"></div>
        </div>
      </div>

      <div class="status-chip ${
        percent >= 1 ? "status-ok" : "status-bad"
      }">${status || (percent >= 1 ? "bateu a meta" : "não bateu")}</div>
    `;

    container.appendChild(card);
  });
}
