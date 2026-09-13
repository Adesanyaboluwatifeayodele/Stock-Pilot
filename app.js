/* StockPilot — polished client-side inventory demo */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE = {
  products: "stockpilot_products_v2",
  movements: "stockpilot_movements_v2",
  session: "stockpilot_session_v2",
  theme: "stockpilot_theme_v2",
  supabase: "stockpilot_supabase_v2"
};

const seedProducts = [
  { id: 1, name: "Wireless Headphones", sku: "WH-1001", category: "Electronics", supplier: "Nova Tech", price: 85000, quantity: 42, reorder: 15, status: "active", description: "Noise-cancelling wireless headphones." },
  { id: 2, name: "Ergonomic Office Chair", sku: "OC-2040", category: "Furniture", supplier: "WorkSpace Ltd", price: 185000, quantity: 8, reorder: 12, status: "active", description: "Adjustable ergonomic office chair." },
  { id: 3, name: "Mechanical Keyboard", sku: "MK-3012", category: "Accessories", supplier: "Nova Tech", price: 72000, quantity: 0, reorder: 10, status: "active", description: "Compact mechanical keyboard." },
  { id: 4, name: "USB-C Hub", sku: "UH-4450", category: "Electronics", supplier: "ConnectPro", price: 32000, quantity: 17, reorder: 8, status: "active", description: "Multi-port USB-C connectivity hub." },
  { id: 5, name: "A4 Printer Paper", sku: "PP-5010", category: "Office", supplier: "Paper House", price: 6500, quantity: 63, reorder: 20, status: "active", description: "Premium 80gsm printer paper." },
  { id: 6, name: "Smart Desk Lamp", sku: "DL-6120", category: "Appliances", supplier: "Bright Living", price: 42000, quantity: 25, reorder: 10, status: "active", description: "LED desk lamp with brightness control." },
  { id: 7, name: "Laptop Stand", sku: "LS-7015", category: "Accessories", supplier: "WorkSpace Ltd", price: 28000, quantity: 6, reorder: 12, status: "active", description: "Aluminium adjustable laptop stand." },
  { id: 8, name: "Wireless Mouse", sku: "WM-8018", category: "Electronics", supplier: "ConnectPro", price: 18000, quantity: 31, reorder: 10, status: "active", description: "Ergonomic wireless mouse." }
];
const seedMovements = [
  { id: 1, type: "in", productId: 1, name: "Wireless Headphones", detail: "Stock received · WH-1001", amount: 20, time: "Today, 09:42", reference: "PO-10021", user: "Admin Owner" },
  { id: 2, type: "out", productId: 2, name: "Ergonomic Office Chair", detail: "Order fulfilled · OC-2040", amount: 4, time: "Today, 08:16", reference: "SO-20118", user: "Admin Owner" },
  { id: 3, type: "in", productId: 5, name: "A4 Printer Paper", detail: "Stock received · PP-5010", amount: 30, time: "Yesterday, 16:20", reference: "PO-10019", user: "Admin Owner" },
  { id: 4, type: "out", productId: 7, name: "Laptop Stand", detail: "Order fulfilled · LS-7015", amount: 3, time: "Yesterday, 13:05", reference: "SO-20112", user: "Admin Owner" }
];

let products = load(STORAGE.products, seedProducts);
let movements = load(STORAGE.movements, seedMovements);
let activeSection = "overview";
let editingId = null;
let pendingConfirm = null;
let currentMovementType = "in";

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : structuredClone(fallback); }
  catch { return structuredClone(fallback); }
}
function save() {
  localStorage.setItem(STORAGE.products, JSON.stringify(products));
  localStorage.setItem(STORAGE.movements, JSON.stringify(movements));
}
const money = n => "₦" + Number(n || 0).toLocaleString("en-NG");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statusOf = p => p.quantity === 0 ? ["out", "Out of stock"] : p.quantity <= p.reorder ? ["low", "Low stock"] : ["in", "In stock"];
const totalValue = () => products.reduce((s, p) => s + p.price * p.quantity, 0);
const lowCount = () => products.filter(p => p.quantity > 0 && p.quantity <= p.reorder).length;
const outCount = () => products.filter(p => p.quantity === 0).length;
const totalUnits = () => products.reduce((s, p) => s + p.quantity, 0);
const categories = () => [...new Set(products.map(p => p.category))].sort();
const suppliers = () => [...new Set(products.map(p => p.supplier))].sort();

function showToast(message, type = "success") {
  const el = $("#toast"); el.textContent = message; el.className = `toast show ${type}`;
  clearTimeout(showToast.t); showToast.t = setTimeout(() => el.className = "toast", 3200);
}
function openModal(id) { $(id).classList.add("open"); document.body.classList.add("modal-open"); }
function closeModal(id) { $(id).classList.remove("open"); if (!$$(".modal-backdrop.open").length) document.body.classList.remove("modal-open"); }
function askConfirm(title, text, callback) {
  $("#confirmTitle").textContent = title; $("#confirmText").textContent = text; pendingConfirm = callback; openModal("#confirmBackdrop");
}
function commitConfirm() { const cb = pendingConfirm; pendingConfirm = null; closeModal("#confirmBackdrop"); if (cb) cb(); }

function render() {
  const titles = { overview: "Overview", inventory: "Inventory", "movements": "Stock Movements", suppliers: "Suppliers", reports: "Reports", settings: "Settings" };
  $("#pageTitle").textContent = titles[activeSection];
  $("#sectionHeading").innerHTML = activeSection === "overview" ? 'Good morning, Adesanya ' : titles[activeSection];
  $("#appView").innerHTML = ({ overview: overviewView, inventory: inventoryView, movements: movementsView, suppliers: suppliersView, reports: reportsView, settings: settingsView })[activeSection]();
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === activeSection));
  bindDynamic();
}

function stat(label, value, icon, color, trend, foot) {
  return `<div class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${color}">${icon}</span></div><div class="stat-value">${value}</div><span class="trend ${String(trend).includes("attention") || String(trend).includes("restock") ? "down" : ""}">${trend}</span><span class="stat-foot">${foot}</span></div>`;
}
function productRow(p) {
  const [cls, label] = statusOf(p);
  const initials = p.name.split(/\s+/).map(x => x[0]).slice(0, 2).join("");
  return `<tr><td><div class="product-cell"><div class="product-thumb">${esc(initials)}</div><div><div class="product-name">${esc(p.name)}</div><div class="sku">${esc(p.sku)}</div></div></div></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.quantity}</td><td><span class="badge ${cls}">${label}</span></td><td><div class="row-actions"><button class="small-btn" data-edit="${p.id}">Edit</button><button class="small-btn danger-text" data-delete="${p.id}">Delete</button></div></td></tr>`;
}
function overviewView() {
  const catRows = categories().map(c => {
    const count = products.filter(p => p.category === c).length, pct = Math.round(count / products.length * 100);
    return `<div class="category-row"><div><div class="category-name">${esc(c)}</div><div class="progress"><span style="width:${pct}%"></span></div></div><div class="category-count">${count} products</div></div>`;
  }).join("");
  const barsIn = [28, 42, 30, 55, 39, 64, 48], barsOut = [18, 27, 22, 34, 31, 42, 29];
  return `<div class="stats-grid">
    ${stat("Total products", products.length, "▤", "purple", "+8.2%", "vs last month")}
    ${stat("Inventory value", money(totalValue()), "₦", "green", "+12.5%", "vs last month")}
    ${stat("Low stock items", lowCount(), "◒", "orange", lowCount() ? "Needs attention" : "All clear", "")}
    ${stat("Out of stock", outCount(), "⊘", "red", outCount() ? "Requires restock" : "All clear", "")}
  </div>
  <div class="dashboard-grid">
    <div class="panel"><div class="panel-header"><div><h3 class="panel-title">Inventory overview</h3><p class="panel-subtitle">Recorded stock activity across the last 7 days</p></div><span class="badge in">${totalUnits().toLocaleString()} units</span></div>
      <div class="chart"><div class="chart-grid"></div>${barsIn.map((h, i) => `<div class="bar-group"><div class="bar-stack" style="--h:${Math.max(h, barsOut[i])}"><div class="bar primary" style="height:${h}%"></div><div class="bar secondary" style="height:${barsOut[i]}%"></div></div><span class="bar-label">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span></div>`).join("")}</div>
      <div class="legend"><span><i class="dot" style="background:var(--primary)"></i>Stock in</span><span><i class="dot" style="background:#b8b4ff"></i>Stock out</span></div>
    </div>
    <div class="panel"><div class="panel-header"><div><h3 class="panel-title">Inventory by category</h3><p class="panel-subtitle">Product distribution</p></div><span class="badge in">${products.length} total</span></div><div class="category-list">${catRows}</div></div>
  </div>
  ${lowStockPanel()}
  <div class="panel table-panel"><div class="panel-header"><div><h3 class="panel-title">Recent inventory</h3><p class="panel-subtitle">Your latest product records</p></div><button class="secondary-btn" data-go="inventory">View all →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead><tbody>${products.slice(0, 5).map(productRow).join("")}</tbody></table></div></div>`;
}
function lowStockPanel() {
  const low = products.filter(p => p.quantity <= p.reorder);
  if (!low.length) return `<div class="alert-panel success-alert"><strong>Inventory health looks good.</strong><span>No products are currently at or below their reorder level.</span></div>`;
  return `<div class="alert-panel"><div><strong>Low-stock attention</strong><span>${low.length} product${low.length === 1 ? "" : "s"} need review.</span></div><button class="secondary-btn" data-go="inventory">Review stock →</button></div>`;
}
function inventoryView() {
  return `<div class="panel section-card"><div class="panel-header"><div><h3 class="panel-title">All products</h3><p class="panel-subtitle">${products.length} catalogue records · persisted in this browser</p></div><div class="table-tools"><button class="secondary-btn" id="exportInventory">⇩ CSV</button><button class="primary-btn" id="addProductInner">+ Add product</button></div></div>
 <div class="filter-bar"><label class="filter-search">⌕<input id="inventorySearch" placeholder="Search name, SKU or supplier..." /></label><select id="categoryFilter"><option value="">All categories</option>${categories().map(c => `<option>${esc(c)}</option>`).join("")}</select><select id="stockFilter"><option value="">All stock status</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><button class="secondary-btn" id="clearFilters">Clear</button></div>
 <div class="result-count" id="resultCount"></div><div class="table-wrap"><table class="data-table inventory-table"><thead><tr><th>Product</th><th>Category</th><th>Supplier</th><th>Unit price</th><th>Quantity</th><th>Status</th><th>Actions</th></tr></thead><tbody id="inventoryRows">${products.map(productRow).join("")}</tbody></table></div></div>`;
}
function movementsView() {
  const inCount = movements.filter(m => m.type === "in").reduce((s, m) => s + m.amount, 0), out = movements.filter(m => m.type === "out").reduce((s, m) => s + m.amount, 0);
  return `<div class="stats-grid movement-stats">${stat("Units received", inCount, "↓", "green", "Stock in", "recorded")} ${stat("Units issued", out, "↑", "orange", "Stock out", "recorded")} ${stat("Transactions", movements.length, "⇄", "purple", "All activity", "logged")} ${stat("Products affected", new Set(movements.map(m => m.productId)).size, "▤", "red", "Movement history", "")} </div>
 <div class="panel"><div class="panel-header"><div><h3 class="panel-title">Stock movements</h3><p class="panel-subtitle">Every transaction is saved locally with a timestamp and reference.</p></div><button class="primary-btn" id="recordMovement">+ Record movement</button></div><div class="movement-list">${movements.length ? movements.map(m => `<div class="movement"><div class="movement-symbol ${m.type === "in" ? "green" : "orange"}">${m.type === "in" ? "↓" : "↑"}</div><div class="movement-main"><strong>${esc(m.name)}</strong><span>${esc(m.detail)}</span><small>${esc(m.time)} · ${esc(m.user || "Admin")}${m.reference ? ` · ${esc(m.reference)}` : ""}</small></div><b class="${m.type === "in" ? "amount-in" : "amount-out"}">${m.type === "in" ? "+" : "−"}${m.amount}</b></div>`).join("") : `<div class="empty-state">No movements recorded yet.</div>`}</div></div>`;
}
function suppliersView() {
  const rows = suppliers().map(s => { const ps = products.filter(p => p.supplier === s); const value = ps.reduce((a, p) => a + p.price * p.quantity, 0); return `<tr><td><strong>${esc(s)}</strong></td><td>${ps.length}</td><td>${ps.reduce((a, p) => a + p.quantity, 0).toLocaleString()}</td><td>${money(value)}</td><td><span class="badge ${ps.some(p => p.quantity <= p.reorder) ? "low" : "in"}">${ps.some(p => p.quantity <= p.reorder) ? "Needs attention" : "Healthy"}</span></td></tr>` }).join("");
  return `<div class="panel table-panel"><div class="panel-header"><div><h3 class="panel-title">Supplier performance</h3><p class="panel-subtitle">Suppliers represented in your catalogue</p></div><span class="badge in">${suppliers().length} suppliers</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Supplier</th><th>Products</th><th>Units</th><th>Stock value</th><th>Health</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function reportsView() {
  const active = products.filter(p => p.status === "active").length, avg = products.length ? Math.round(totalUnits() / products.length) : 0;
  const top = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  return `<div class="stats-grid">${stat("Stock value", money(totalValue()), "₦", "green", "Current", "at cost")} ${stat("Units on hand", totalUnits().toLocaleString(), "▤", "purple", "Current", "all products")} ${stat("Active SKUs", active, "✓", "green", "Catalogue", "active")} ${stat("Avg. units / SKU", avg, "◫", "orange", "Current", "average")}</div>
 <div class="dashboard-grid"><div class="panel"><div class="panel-header"><div><h3 class="panel-title">Stock concentration</h3><p class="panel-subtitle">Highest unit quantities currently on hand</p></div></div>${top.map(p => { const pct = totalUnits() ? Math.round(p.quantity / totalUnits() * 100) : 0; return `<div class="report-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.sku)} · ${p.quantity} units</span></div><b>${pct}%</b><div class="progress"><span style="width:${pct}%"></span></div></div>` }).join("")}</div><div class="panel"><div class="panel-header"><div><h3 class="panel-title">Inventory health</h3><p class="panel-subtitle">Actionable stock coverage</p></div></div><div class="health-list"><div><span>Healthy stock</span><b>${products.filter(p => p.quantity > p.reorder).length}</b></div><div><span>Low stock</span><b>${lowCount()}</b></div><div><span>Out of stock</span><b>${outCount()}</b></div><div><span>Draft products</span><b>${products.filter(p => p.status === "draft").length}</b></div></div></div></div>
 <div class="panel"><div class="panel-header"><div><h3 class="panel-title">Export-ready report</h3><p class="panel-subtitle">Download the current catalogue as CSV for Excel, Sheets or accounting workflows.</p></div><button class="primary-btn" id="exportReport">Export CSV →</button></div></div>`;
}
function settingsView() {
  const cfg = load(STORAGE.supabase, { url: "", anonKey: "" });
  return `<div class="settings-grid"><div class="panel"><div class="panel-header"><div><h3 class="panel-title">Supabase connection</h3><p class="panel-subtitle">Ready for a real database when you move beyond the demo.</p></div><span class="badge ${cfg.url && cfg.anonKey ? "in" : "draft"}">${cfg.url && cfg.anonKey ? "Configured" : "Demo mode"}</span></div>
 <div class="callout"><strong>Production architecture</strong><span>Products, stock movements and admin authentication can be moved to Supabase without changing the core dashboard workflow.</span></div>
 <form id="supabaseForm" class="settings-form"><label>Project URL<input id="supabaseUrl" type="url" placeholder="https://your-project.supabase.co" value="${esc(cfg.url)}"></label><label>Anon public key<input id="supabaseKey" type="text" placeholder="Your Supabase anon public key" value="${esc(cfg.anonKey)}"></label><div class="settings-actions"><button type="submit" class="primary-btn">Save connection settings</button><button type="button" class="secondary-btn" id="clearSupabase">Clear</button></div></form>
 <p class="security-note">Never place a Supabase service-role key in browser code. Use the public anon key with Row Level Security enabled.</p></div>
 <div class="panel"><div class="panel-header"><div><h3 class="panel-title">Application</h3><p class="panel-subtitle">Local demo preferences</p></div></div><div class="settings-list"><div><span>Browser persistence</span><b class="badge in">Enabled</b></div><div><span>Session</span><b>${esc((load(STORAGE.session, { email: "Admin" }).email) || "Admin")}</b></div><div><span>Theme</span><b>${document.documentElement.dataset.theme === "dark" ? "Dark" : "Light"}</b></div></div><button class="secondary-btn full-btn" id="resetDemo">Reset demo data</button><button class="danger-btn full-btn" id="logoutSettings">Sign out</button></div></div>`;
}

function filterInventory() {
  const q = ($("#inventorySearch")?.value || $("#globalSearch")?.value || "").trim().toLowerCase();
  const cat = $("#categoryFilter")?.value || "", stock = $("#stockFilter")?.value || "";
  const rows = products.filter(p => {
    const text = `${p.name} ${p.sku} ${p.supplier}`.toLowerCase(), st = statusOf(p)[0];
    return (!q || text.includes(q)) && (!cat || p.category === cat) && (!stock || st === stock);
  });
  if ($("#inventoryRows")) $("#inventoryRows").innerHTML = rows.length ? rows.map(productRow).join("") : `<tr><td colspan="7"><div class="empty-state">No products match your filters.</div></td></tr>`;
  if ($("#resultCount")) $("#resultCount").textContent = `Showing ${rows.length} of ${products.length} products`;
  bindRowActions();
}
function bindRowActions() {
  $$("[data-edit]").forEach(b => b.onclick = () => openProduct(Number(b.dataset.edit)));
  $$("[data-delete]").forEach(b => b.onclick = () => askConfirm("Delete product?", "This will permanently remove the product from this browser demo.", () => deleteProduct(Number(b.dataset.delete))));
}
function bindDynamic() {
  bindRowActions();
  $$("[data-go]").forEach(b => b.onclick = () => { activeSection = b.dataset.go; render() });
  $("#addProductInner")?.addEventListener("click", () => openProduct());
  $("#recordMovement")?.addEventListener("click", openMovement);
  $("#exportInventory")?.addEventListener("click", exportCSV);
  $("#exportReport")?.addEventListener("click", exportCSV);
  $("#inventorySearch")?.addEventListener("input", filterInventory);
  $("#categoryFilter")?.addEventListener("change", filterInventory);
  $("#stockFilter")?.addEventListener("change", filterInventory);
  $("#clearFilters")?.addEventListener("click", () => { $("#inventorySearch").value = ""; $("#categoryFilter").value = ""; $("#stockFilter").value = ""; filterInventory(); });
  $("#supabaseForm")?.addEventListener("submit", saveSupabase);
  $("#clearSupabase")?.addEventListener("click", () => { localStorage.removeItem(STORAGE.supabase); render(); showToast("Supabase settings cleared", "info") });
  $("#resetDemo")?.addEventListener("click", () => askConfirm("Reset demo data?", "Products and stock movements will return to the original sample dataset.", () => { products = structuredClone(seedProducts); movements = structuredClone(seedMovements); save(); render(); showToast("Demo data restored", "info") }));
  $("#logoutSettings")?.addEventListener("click", logout);
  if ($("#resultCount")) filterInventory();
}
function openProduct(id) {
  editingId = id || null; const p = id ? products.find(x => x.id === id) : null;
  $("#modalTitle").textContent = p ? "Edit product" : "Add product";
  $("#productId").value = p?.id || "";
  $("#productName").value = p?.name || ""; $("#productSku").value = p?.sku || "";
  $("#productCategory").value = p?.category || categories()[0] || "Electronics"; $("#productSupplier").value = p?.supplier || "";
  $("#productPrice").value = p?.price ?? ""; $("#productQuantity").value = p?.quantity ?? "";
  $("#productReorder").value = p?.reorder ?? ""; $("#productStatus").value = p?.status || "active"; $("#productDescription").value = p?.description || "";
  openModal("#modalBackdrop"); setTimeout(() => $("#productName").focus(), 50);
}
function deleteProduct(id) {
  products = products.filter(p => p.id !== id); movements = movements.filter(m => m.productId !== id); save(); render(); showToast("Product deleted", "success");
}
function saveProduct(e) {
  e.preventDefault(); const name = $("#productName").value.trim(), sku = $("#productSku").value.trim().toUpperCase(), supplier = $("#productSupplier").value.trim();
  const price = Number($("#productPrice").value), qty = Number($("#productQuantity").value), reorder = Number($("#productReorder").value);
  if (!name || !sku || !supplier || ![price, qty, reorder].every(Number.isFinite) || price < 0 || qty < 0 || reorder < 0) return showToast("Please complete all required fields correctly", "error");
  if (products.some(p => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingId)) return showToast("SKU already exists. Use a unique SKU.", "error");
  const data = { id: editingId || Date.now(), name, sku, category: $("#productCategory").value, supplier, price, quantity: qty, reorder, status: $("#productStatus").value, description: $("#productDescription").value.trim() };
  if (editingId) { const old = products.find(p => p.id === editingId); const delta = qty - old.quantity; Object.assign(old, data); if (delta) addMovement(delta > 0 ? "in" : "out", data, Math.abs(delta), "Product edit"); showToast("Product updated successfully"); }
  else { products.unshift(data); if (qty) addMovement("in", data, qty, "Opening balance"); showToast("Product added successfully"); }
  save(); closeModal("#modalBackdrop"); render();
}
function addMovement(type, p, amount, reference, note = "") {
  movements.unshift({ id: Date.now() + Math.random(), type, productId: p.id, name: p.name, detail: `${type === "in" ? "Stock received" : "Order fulfilled"} · ${p.sku}`, amount, time: "Just now", reference: reference || "", user: "Admin Owner", note });
}
function openMovement() {
  currentMovementType = "in"; $("#movementType").value = "in"; $$(".movement-type").forEach(b => b.classList.toggle("active", b.dataset.movementType === "in"));
  $("#movementProduct").innerHTML = products.map(p => `<option value="${p.id}">${esc(p.name)} · ${esc(p.sku)} · ${p.quantity} units</option>`).join("");
  $("#movementQuantity").value = ""; $("#movementReference").value = ""; $("#movementNote").value = ""; updateMovementPreview(); openModal("#movementBackdrop");
}
function updateMovementPreview() {
  const p = products.find(x => x.id === Number($("#movementProduct")?.value)), qty = Number($("#movementQuantity")?.value || 0);
  if (!p) { $("#movementPreview").textContent = ""; return }
  const next = currentMovementType === "in" ? p.quantity + qty : p.quantity - qty;
  $("#movementPreview").innerHTML = `<span>Current stock: <b>${p.quantity}</b></span><span>After movement: <b class="${next < 0 ? "preview-error" : ""}">${next}</b></span>`;
}
function saveMovement(e) {
  e.preventDefault(); const p = products.find(x => x.id === Number($("#movementProduct").value)), qty = Number($("#movementQuantity").value);
  if (!p || !Number.isInteger(qty) || qty < 1) return showToast("Enter a valid whole-number quantity.", "error");
  if (currentMovementType === "out" && qty > p.quantity) return showToast(`Cannot stock out ${qty} units. Only ${p.quantity} are available.`, "error");
  const reference = $("#movementReference").value.trim(), note = $("#movementNote").value.trim();
  askConfirm(currentMovementType === "in" ? "Confirm stock in" : "Confirm stock out", `${currentMovementType === "in" ? "Add" : "Remove"} ${qty} unit${qty === 1 ? "" : "s"} ${currentMovementType === "in" ? "to" : "from"} ${p.name}?`, () => {
    p.quantity += currentMovementType === "in" ? qty : -qty;
    addMovement(currentMovementType, p, qty, reference, note); save(); closeModal("#movementBackdrop"); render(); showToast(`Stock ${currentMovementType === "in" ? "in" : "out"} recorded successfully`);
  });
}
function saveSupabase(e) {
  e.preventDefault(); const url = $("#supabaseUrl").value.trim(), anonKey = $("#supabaseKey").value.trim();
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return showToast("Enter a valid Supabase project URL.", "error");
  localStorage.setItem(STORAGE.supabase, JSON.stringify({ url, anonKey })); showToast("Supabase configuration saved"); render();
}
function exportCSV() {
  const headers = ["Product", "SKU", "Category", "Supplier", "Unit Price (NGN)", "Quantity", "Reorder Level", "Status", "Stock Status"];
  const rows = products.map(p => [p.name, p.sku, p.category, p.supplier, p.price, p.quantity, p.reorder, p.status, statusOf(p)[1]]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `stockpilot-inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href); showToast("CSV export downloaded");
}
function logout() {
  localStorage.removeItem(STORAGE.session); $("#appShell").classList.remove("authenticated"); $("#loginScreen").classList.remove("hidden"); $("#loginPassword").value = ""; $("#loginError").textContent = "";
}
function authenticate() {
  const session = load(STORAGE.session, null);
  if (session?.email) { $("#loginScreen").classList.add("hidden"); $("#appShell").classList.add("authenticated"); return; }
  $("#appShell").classList.remove("authenticated"); $("#loginScreen").classList.remove("hidden");
}
function init() {
  const theme = localStorage.getItem(STORAGE.theme) || "light"; document.documentElement.dataset.theme = theme;
  authenticate(); render();
  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault(); const email = $("#loginEmail").value.trim().toLowerCase(), pw = $("#loginPassword").value.trim();
    if (email === "admin@stockpilot.demo" && pw === "Admin123!") { localStorage.setItem(STORAGE.session, JSON.stringify({ email, role: "admin", loginAt: new Date().toISOString() })); $("#loginScreen").classList.add("hidden"); $("#appShell").classList.add("authenticated"); $("#loginError").textContent = ""; showToast("Welcome back, Admin"); }
    else $("#loginError").textContent = "Invalid demo credentials. Use admin@stockpilot.demo / Admin123!";
  });
  $("#togglePassword").onclick = () => { const i = $("#loginPassword"); i.type = i.type === "password" ? "text" : "password"; $("#togglePassword").textContent = i.type === "password" ? "Show" : "Hide" };
  $("#closeModal").onclick = () => closeModal("#modalBackdrop"); $("#cancelModal").onclick = () => closeModal("#modalBackdrop"); $("#productForm").addEventListener("submit", saveProduct);
  $("#closeMovement").onclick = () => closeModal("#movementBackdrop"); $("#cancelMovement").onclick = () => closeModal("#movementBackdrop"); $("#movementForm").addEventListener("submit", saveMovement);
  $("#confirmCancel").onclick = () => { pendingConfirm = null; closeModal("#confirmBackdrop") }; $("#confirmOk").onclick = commitConfirm;
  $$(".movement-type").forEach(b => b.onclick = () => { currentMovementType = b.dataset.movementType; $("#movementType").value = currentMovementType; $$(".movement-type").forEach(x => x.classList.toggle("active", x === b)); updateMovementPreview() });
  $("#movementProduct").addEventListener("change", updateMovementPreview); $("#movementQuantity").addEventListener("input", updateMovementPreview);
  $$(".nav-item").forEach(b => b.onclick = () => { activeSection = b.dataset.section; render(); $("#sidebar").classList.remove("open") });
  $("#mobileMenu").onclick = () => $("#sidebar").classList.toggle("open");
  $("#themeToggle").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; localStorage.setItem(STORAGE.theme, t); if (activeSection === "settings") render() };
  $("#addProductTop").onclick = () => openProduct(); $("#addProductBtn").onclick = () => openProduct(); $("#exportBtn").onclick = exportCSV;
  $("#globalSearch").addEventListener("input", () => { if (activeSection !== "inventory") { activeSection = "inventory"; render() } else filterInventory() });
  $("#notificationBtn").onclick = () => showToast(outCount() ? `${outCount()} out-of-stock item${outCount() === 1 ? "" : "s"} require restocking.` : "No urgent stock alerts.", "info");
  $("#quickReportBtn").onclick = () => { activeSection = "reports"; render() };
  document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".modal-backdrop.open").forEach(x => closeModal("#" + x.id)); });
}
init();
