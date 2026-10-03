/* =========================================================
   script.js — ใช้ร่วมกันทุกหน้า (product.html / order.html / admin.html)
   ========================================================= */

/* ---------- ตั้งค่า ---------- */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXEqlpBLOHE1c36O8syIiqX2wx4HDEs4GSF4lxatY_5LzoBSpcuGvXTDO_yL_oQm6M/exec";
const TELEGRAM_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMSuoeIrUGj69R2TJS3ut-AyYljSxeGewCl-o8cwXJ207-cwxlr9Cw9S4v5lTVwyPm7A/exec";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRE3Eu6X1jQjLVHjTZF-xKeG4FgBuYbQPjww1c84TGHDIqwWrn9siz6SFEbO02XATFalYfon3YuBiSq/pub?gid=0&single=true&output=csv";
const PRODUCTS_JSON_URL = "products.json";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) {
    initProductPage();
  }
  if (document.getElementById("orderForm")) {
    initOrderPage();
  }
  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
});

/* =========================================================
   1) product.html
   ========================================================= */
function initProductPage() {
  const listEl = document.getElementById("product-list");
  const filterBar = document.getElementById("filter-bar");

  fetch(PRODUCTS_JSON_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((products) => {
      const moodFromUrl = new URLSearchParams(window.location.search).get("mood");

      if (filterBar) {
        buildFilterBar(filterBar, products, listEl, moodFromUrl);
      }

      renderProductCards(listEl, filterProducts(products, moodFromUrl));
    })
    .catch((err) => {
      console.error(err);
      if (listEl) {
        listEl.innerHTML = "<p>ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>";
      }
    });
}

function filterProducts(products, mood) {
  if (!mood || mood.toLowerCase() === "all") return products;
  return products.filter(
    (p) => (p.type || "").toLowerCase() === mood.toLowerCase()
  );
}

function buildFilterBar(filterBar, products, listEl, activeMood) {
  const types = Array.from(new Set(products.map((p) => p.type))).filter(Boolean);

  filterBar.innerHTML = "";

  const makeButton = (label, value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-swatch filter-btn";
    btn.textContent = label;
    btn.dataset.mood = value;
    if (
      (!activeMood && value === "all") ||
      (activeMood && activeMood.toLowerCase() === value.toLowerCase())
    ) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      filterBar
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      const url = new URL(window.location.href);
      if (value === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", value);
      }
      window.history.replaceState({}, "", url);

      renderProductCards(listEl, filterProducts(products, value));
    });
    return btn;
  };

  filterBar.appendChild(makeButton("ทั้งหมด", "all"));
  types.forEach((type) => filterBar.appendChild(makeButton(type, type)));
}

function renderProductCards(listEl, products) {
  if (!listEl) return;

  if (!products.length) {
    listEl.innerHTML = "<p>ไม่พบสินค้าในหมวดนี้</p>";
    return;
  }

  listEl.innerHTML = "";

  products.forEach((product) => {
    const sizes = Array.isArray(product.size) ? product.size : [product.size];
    const image = product.image || (product.images && product.images[0]) || "";

    const card = document.createElement("article");
    card.className = "product-card";

    const sizeOptionsHtml = sizes
      .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      .join("");

    card.innerHTML = `
      <div class="product-card__image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      </div>
      <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
      <p class="product-card__meta">${escapeHtml(product.material || "")}</p>
      <div class="option-group">
        <label class="option-group__label" for="size-${product.id}">ไซส์</label>
        <select id="size-${product.id}" class="size-select">
          ${sizeOptionsHtml}
        </select>
      </div>
      <p class="product-card__price">฿${Number(product.price).toLocaleString("th-TH")}</p>
      <button type="button" class="btn btn-accent order-btn">สั่งซื้อ</button>
    `;

    const orderBtn = card.querySelector(".order-btn");
    const sizeSelect = card.querySelector(".size-select");

    orderBtn.addEventListener("click", () => {
      const chosenSize = sizeSelect ? sizeSelect.value : "";
      const params = new URLSearchParams({
        item: product.name,
        size: chosenSize,
        price: product.price,
      });
      window.location.href = `order.html?${params.toString()}`;
    });

    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* =========================================================
   2) order.html
   ========================================================= */
function initOrderPage() {
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item") || "";
  const size = params.get("size") || "";
  const price = params.get("price") || "";

  const itemsField = document.getElementById("items");
  const totalField = document.getElementById("total");

  if (itemsField) {
    itemsField.value = size ? `${item} (${size})` : item;
  }

  if (totalField) {
    totalField.value = price;
  }

  const form = document.getElementById("orderForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: getValue("customerName"),
      contact: getValue("contact"),
      items: getValue("items"),
      total: getValue("total"),
      note: getValue("note"),
    };

    Promise.allSettled([
      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      }),
      fetch(TELEGRAM_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      }),
    ]).then(([orderResult, telegramResult]) => {
      if (orderResult.status === "rejected") {
        console.error("[Sheet] ส่งไม่สำเร็จ:", orderResult.reason);
      }
      if (telegramResult.status === "rejected") {
        console.error("[Telegram] ส่งไม่สำเร็จ:", telegramResult.reason);
      }

      if (orderResult.status === "rejected" && telegramResult.status === "rejected") {
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        return;
      }
      window.location.href = "thankyou.html";
    });
  });
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

/* =========================================================
   3) admin.html
   ========================================================= */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");

  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูลจาก CSV ไม่สำเร็จ");
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      renderOrdersTable(tbody, rows);
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</td></tr>`;
    });
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const cleaned = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\r") {
        // ข้าม \r
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];

  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ""));

  return dataRows.map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx].trim() : "";
    });
    return obj;
  });
}

function pickField(row, keys, fallbackIndex) {
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const found = rowKeys.find((k) => k.toLowerCase() === key.toLowerCase());
    if (found) return row[found];
  }
  if (fallbackIndex !== undefined) {
    const fallbackKey = rowKeys[fallbackIndex];
    return fallbackKey ? row[fallbackKey] : "";
  }
  return "";
}

function renderOrdersTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>`;
    return;
  }

  const mapped = rows.map((row) => ({
    timestamp: pickField(row, ["Timestamp", "timestamp", "วันเวลา"], 0),
    customerName: pickField(row, ["customerName", "ชื่อลูกค้า"], 1),
    contact: pickField(row, ["contact", "เบอร์โทร/Line", "เบอร์โทร", "Line"], 2),
    items: pickField(row, ["items", "รายการสินค้า"], 3),
    total: pickField(row, ["total", "จำนวนเงินรวม"], 4),
    note: pickField(row, ["note", "หมายเหตุ"], 5),
  }));

  mapped.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    const validA = !isNaN(dateA);
    const validB = !isNaN(dateB);
    if (validA && validB) return dateB - dateA;
    return 0;
  });
  if (isNaN(new Date(mapped[0] ? mapped[0].timestamp : ""))) {
    mapped.reverse();
  }

  tbody.innerHTML = mapped
    .map(
      (r) => `
        <tr>
          <td>${escapeHtml(r.timestamp)}</td>
          <td>${escapeHtml(r.customerName)}</td>
          <td>${escapeHtml(r.contact)}</td>
          <td>${escapeHtml(r.items)}</td>
          <td>${escapeHtml(r.total)}</td>
          <td>${escapeHtml(r.note)}</td>
        </tr>
      `
    )
    .join("");
}
