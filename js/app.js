/* Artify Admin Panel — Supabase JS v2 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cfg = window.ARTIFY_CONFIG || {};
  let db = null, products = [], orders = [], activePage = "overview", currentUser = null;
  const money = n => "₱" + Number(n || 0).toLocaleString("en-PH");
  const date = value => value ? new Date(value).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}) : "—";
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const statusText = value => String(value || "unknown").replaceAll("_"," ");
  const statusPill = value => `<span class="status-pill ${safe(value)}">${safe(statusText(value))}</span>`;
  const showNotice = (message, bad=false) => { const el=$("notice"); el.textContent=message; el.className="notice"+(bad?" bad":""); window.setTimeout(()=>el.classList.add("hidden"),5000); };
  const fail = (error, context) => { console.error(context,error); showNotice(`${context}: ${error?.message || "Unknown error"}`,true); };
  function configured() { return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("PASTE_YOUR"); }
  function setLoggedIn(user) {
    currentUser=user; $("adminEmail").textContent=user.email || "Admin";
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
  }
  function setLoggedOut() { currentUser=null; $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); }
  async function verifyAdmin() {
    const {data,error}=await db.rpc("current_user_role");
    if(error) throw error;
    if(data !== "admin") { await db.auth.signOut(); throw new Error("This account does not have the admin role. Ask the project owner to grant app_metadata.role = admin."); }
  }
  async function startSession(session) {
    try { await verifyAdmin(); setLoggedIn(session.user); await loadAll(); }
    catch(error) { $("loginError").textContent=error.message || "Admin verification failed."; setLoggedOut(); }
  }
  async function loadAll() {
    if(!db) return;
    const [p,o]=await Promise.all([
      db.from("products").select("*").order("created_at",{ascending:false}),
      db.from("orders").select("*").order("created_at",{ascending:false}).limit(500)
    ]);
    if(p.error) fail(p.error,"Could not load products");
    else products=p.data || [];
    if(o.error) { orders=[]; console.warn("Orders unavailable. Apply admin policies in sql/admin_setup.sql.",o.error); }
    else orders=o.data || [];
    renderAll();
    if(o.error) showNotice("Products loaded. Orders are restricted until the admin RLS policies in sql/admin_setup.sql are applied.",true);
  }
  function renderAll() {
    $("statProducts").textContent=products.length;
    $("statActive").textContent=products.filter(p=>p.is_active).length;
    $("statLow").textContent=products.filter(p=>Number(p.stock)<=10).length;
    $("statOrders").textContent=orders.length;
    $("productNavCount").textContent=products.length;
    renderLowStock(); renderRecentOrders(); renderProducts(); renderOrders();
  }
  function renderLowStock() {
    const list=products.filter(p=>Number(p.stock)<=10).sort((a,b)=>a.stock-b.stock).slice(0,5);
    $("lowStockList").innerHTML=list.length?list.map(p=>`<div class="low-row"><img class="product-thumb" src="${safe(p.image_url || "")}" alt="" onerror="this.style.visibility='hidden'"><div class="low-info"><b>${safe(p.name)}</b><small>${safe(p.category || "Uncategorized")}</small></div><span class="stock-pill">${Number(p.stock)} left</span></div>`).join(""):`<div class="empty">No low-stock products. Nice work!</div>`;
  }
  function renderRecentOrders() {
    const list=orders.slice(0,4);
    $("recentOrders").innerHTML=list.length?list.map(o=>`<div class="order-row"><div class="order-info"><b>#${safe(String(o.id).slice(0,8).toUpperCase())} · ${safe(o.customer_name)}</b><small>${date(o.created_at)} · ${money(o.total_amount)}</small></div>${statusPill(o.status)}</div>`).join(""):`<div class="empty">${orders.length===0?"No orders available or order access is not configured.":"No recent orders."}</div>`;
  }
  function renderProducts() {
    const q=$("productSearch").value.toLowerCase(), filter=$("productStatus").value;
    const list=products.filter(p=>(`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q))&&(filter==="all"||(filter==="active"&&p.is_active)||(filter==="inactive"&&!p.is_active)||(filter==="low"&&Number(p.stock)<=10)));
    $("productsBody").innerHTML=list.length?list.map(p=>`<tr><td><div class="table-product"><img class="product-thumb" src="${safe(p.image_url || "")}" alt="" onerror="this.style.visibility='hidden'"><div><b>${safe(p.name)}</b><small>${safe(p.brand || "—")}</small></div></div></td><td>${safe(p.category)}</td><td><strong>${money(p.price)}</strong></td><td>${Number(p.stock)<=10?`<span class="stock-pill">${p.stock} left</span>`:`${p.stock} units`}</td><td>${statusPill(p.is_active?"active":"inactive")}</td><td><div class="row-actions"><button class="icon-btn" data-edit="${safe(p.id)}" title="Edit product">✎</button><button class="icon-btn" data-toggle="${safe(p.id)}" title="${p.is_active?"Deactivate":"Activate"}">${p.is_active?"◉":"○"}</button></div></td></tr>`).join(""):`<tr><td colspan="6" class="empty">No products match your search.</td></tr>`;
    $("productCount").textContent=`Showing ${list.length} of ${products.length} products`;
  }
  function renderOrders() {
    const q=$("orderSearch").value.toLowerCase(), filter=$("orderStatus").value;
    const list=orders.filter(o=>(`${o.id} ${o.customer_name} ${o.phone}`.toLowerCase().includes(q))&&(filter==="all"||o.status===filter));
    $("ordersBody").innerHTML=list.length?list.map(o=>`<tr><td><strong>#${safe(String(o.id).slice(0,8).toUpperCase())}</strong><br><small class="muted">${safe(o.payment_method)}</small></td><td><strong>${safe(o.customer_name)}</strong><br><small class="muted">${safe(o.phone)}</small></td><td>${date(o.created_at)}</td><td>${statusPill(o.payment_status)}</td><td><strong>${money(o.total_amount)}</strong></td><td>${statusPill(o.status)}</td><td><div class="row-actions"><button class="icon-btn" data-order="${safe(o.id)}">View</button><select class="status-select" data-order-status="${safe(o.id)}" aria-label="Update order status"><option value="">Update status</option>${["processing","awaiting_payment","completed","cancelled"].map(s=>`<option value="${s}" ${o.status===s?"disabled":""}>${statusText(s)}</option>`).join("")}</select></div></td></tr>`).join(""):`<tr><td colspan="7" class="empty">No orders available. If you expect orders, apply the admin RLS policies in sql/admin_setup.sql.</td></tr>`;
    $("orderCount").textContent=`Showing ${list.length} of ${orders.length} orders`;
  }
  function openProduct(product=null) {
    $("productForm").reset(); $("productFormError").textContent=""; $("productId").value=product?.id || "";
    $("modalTitle").textContent=product?"Edit product":"Add product";
    $("pName").value=product?.name || ""; $("pBrand").value=product?.brand || "Artify Studio";
    $("pCategory").value=product?.category || ""; $("pPrice").value=product?.price ?? "";
    $("pStock").value=product?.stock ?? 0; $("pImage").value=product?.image_url || "";
    $("pDescription").value=product?.description || ""; $("pTint").value=product?.tint_hex || "E9D8C3";
    $("pIcon").value=product?.icon_name || "palette_outlined"; $("pActive").checked=product?.is_active ?? true;
    $("productModal").classList.remove("hidden");
  }
  function closeProduct() { $("productModal").classList.add("hidden"); }
  async function saveProduct(event) {
    event.preventDefault(); const id=$("productId").value;
    const tint=$("pTint").value.trim().replace(/^#/,"");
    if(tint && !/^[0-9a-fA-F]{6}$/.test(tint)) { $("productFormError").textContent="Tint must be a 6-digit hex color, such as E9D8C3."; return; }
    const payload={name:$("pName").value.trim(),brand:$("pBrand").value.trim(),category:$("pCategory").value.trim(),price:Number($("pPrice").value),stock:Number($("pStock").value),image_url:$("pImage").value.trim()||null,description:$("pDescription").value.trim(),tint_hex:tint||"E9D8C3",icon_name:$("pIcon").value,is_active:$("pActive").checked};
    const button=$("productForm").querySelector('button[type="submit"]'); button.disabled=true; button.textContent="Saving…";
    try {
      const result=id?await db.from("products").update(payload).eq("id",id).select().single():await db.from("products").insert(payload).select().single();
      if(result.error) throw result.error;
      closeProduct(); await loadAll(); showNotice(id?"Product updated successfully.":"Product added successfully.");
    } catch(error) { $("productFormError").textContent=error.message || "Could not save product."; }
    finally { button.disabled=false; button.textContent="Save product"; }
  }
  async function toggleProduct(id) {
    const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
    const {error}=await db.from("products").update({is_active:!p.is_active}).eq("id",id);
    if(error) return fail(error,"Could not update product");
    await loadAll(); showNotice(p.is_active?"Product deactivated.":"Product activated.");
  }
  function showOrder(id) {
    const o=orders.find(x=>String(x.id)===String(id)); if(!o)return;
    $("orderModalTitle").textContent="Order #"+String(o.id).slice(0,8).toUpperCase();
    $("orderDetails").innerHTML=`<div class="detail-grid"><div class="detail-cell"><small>Customer</small><b>${safe(o.customer_name)}</b></div><div class="detail-cell"><small>Order date</small><b>${date(o.created_at)}</b></div><div class="detail-cell"><small>Phone</small><b>${safe(o.phone)}</b></div><div class="detail-cell"><small>Total amount</small><b>${money(o.total_amount)}</b></div><div class="detail-cell"><small>Payment method</small><b>${safe(o.payment_method)}</b></div><div class="detail-cell"><small>Payment status</small><b>${safe(statusText(o.payment_status))}</b></div><div class="detail-cell"><small>Order status</small><b>${safe(statusText(o.status))}</b></div><div class="detail-cell"><small>Shipping fee</small><b>${money(o.shipping_fee)}</b></div></div><div class="detail-address"><b>Delivery address</b><br>${safe(o.address)}</div>`;
    $("orderModal").classList.remove("hidden");
  }
  async function updateOrderStatus(id,status) {
    if(!status)return;
    if(status==="completed" && !confirm("Mark this order as completed?")) { await loadAll(); return; }
    const {error}=await db.from("orders").update({status}).eq("id",id);
    if(error) { fail(error,"Could not update order status"); await loadAll(); return; }
    await loadAll(); showNotice("Order status updated.");
  }
  function go(page) {
    activePage=page;
    document.querySelectorAll(".page").forEach(el=>el.classList.add("hidden"));
    $(page+"Page").classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
    $("pageHeading").textContent=({overview:"Overview",products:"Products",orders:"Orders"})[page]||"Overview";
  }
  function wireEvents() {
    $("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";
      if(!configured()){ $("loginError").textContent="Set your Supabase URL and anon/publishable key in js/config.js first.";return; }
      const button=$("loginForm").querySelector("button[type=submit]");button.disabled=true;button.textContent="Signing in…";
      try {const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)throw error;await startSession(data.session);}
      catch(error){$("loginError").textContent=error.message||"Sign-in failed.";}finally{button.disabled=false;button.textContent="Sign in to dashboard";}
    });
    $("logoutBtn").addEventListener("click",async()=>{if(db)await db.auth.signOut();setLoggedOut();});
    document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
    document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.goto)));
    $("refreshBtn").addEventListener("click",loadAll); $("addProductBtn").addEventListener("click",()=>openProduct());
    $("closeModal").addEventListener("click",closeProduct); $("cancelModal").addEventListener("click",closeProduct);
    $("productForm").addEventListener("submit",saveProduct);
    $("productSearch").addEventListener("input",renderProducts); $("productStatus").addEventListener("change",renderProducts);
    $("orderSearch").addEventListener("input",renderOrders); $("orderStatus").addEventListener("change",renderOrders);
    $("productsBody").addEventListener("click",e=>{const edit=e.target.closest("[data-edit]"),toggle=e.target.closest("[data-toggle]");if(edit)openProduct(products.find(p=>String(p.id)===edit.dataset.edit));if(toggle)toggleProduct(toggle.dataset.toggle);});
    $("ordersBody").addEventListener("click",e=>{const b=e.target.closest("[data-order]");if(b)showOrder(b.dataset.order);});
    $("ordersBody").addEventListener("change",e=>{const s=e.target.closest("[data-order-status]");if(s&&s.value)updateOrderStatus(s.dataset.orderStatus,s.value);});
    $("closeOrderModal").addEventListener("click",()=>$("orderModal").classList.add("hidden")); $("closeOrderModalBottom").addEventListener("click",()=>$("orderModal").classList.add("hidden"));
    ["productModal","orderModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target.id===id)$(id).classList.add("hidden");}));
  }
  async function init() {
    wireEvents();
    if(!configured()) { $("loginError").textContent="Configure js/config.js with your Supabase URL and public anon/publishable key.";return; }
    db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
    const {data:{session}}=await db.auth.getSession();
    if(session) await startSession(session);
    db.auth.onAuthStateChange((_event,session)=>{if(!session)setLoggedOut();});
  }
  document.addEventListener("DOMContentLoaded",init);
})();