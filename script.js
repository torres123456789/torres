// TORRES MOTORS — catálogo, cuenta de demostración, reservación y chat.
"use strict";

const vehiclesData = [
["Ford","Mustang","deportivo",2022,895000],["Toyota","RAV4","suv",2023,625000],["Chevrolet","Camaro","deportivo",2021,980000],["Mercedes-Benz","Clase C","sedan",2022,895000],["Honda","CR-V","suv",2023,590000],
["Porsche","911","deportivo",2021,2450000],["Nissan","Sentra","sedan",2023,385000],["Mazda","CX-5","suv",2022,545000],["Volkswagen","Jetta","sedan",2023,420000],["BMW","Serie 3","sedan",2022,850000],
["Audi","A4","sedan",2022,795000],["Kia","Sportage","suv",2023,520000],["Hyundai","Tucson","suv",2023,510000],["Toyota","Corolla","sedan",2023,390000],["Honda","Civic","sedan",2022,465000],
["Ford","Explorer","suv",2022,780000],["Chevrolet","Tahoe","camioneta",2021,1150000],["Nissan","Rogue","suv",2022,495000],["Mazda","3","sedan",2023,435000],["Volkswagen","Tiguan","suv",2022,565000],
["BMW","X5","suv",2021,1250000],["Audi","Q5","suv",2022,920000],["Mercedes-Benz","GLC","suv",2022,990000],["Porsche","Macan","suv",2021,1350000],["Kia","Forte","sedan",2023,335000],
["Hyundai","Elantra","sedan",2023,360000],["Toyota","Highlander","suv",2022,780000],["Honda","Pilot","suv",2021,720000],["Ford","F-150","camioneta",2022,890000],["Chevrolet","Silverado","camioneta",2022,850000],
["Nissan","Frontier","camioneta",2023,595000],["Mazda","CX-9","suv",2021,625000],["Volkswagen","Atlas","suv",2022,720000],["BMW","M4","deportivo",2021,1550000],["Audi","A3","sedan",2023,625000],
["Mercedes-Benz","Clase A","sedan",2022,690000],["Porsche","Cayenne","suv",2021,1650000],["Kia","Telluride","suv",2023,750000],["Hyundai","Santa Fe","suv",2022,590000],["Toyota","Tacoma","camioneta",2022,760000],
["Honda","HR-V","suv",2023,465000],["Ford","Bronco","suv",2022,990000],["Chevrolet","Equinox","suv",2023,485000],["Nissan","Kicks","suv",2023,385000],["Mazda","6","sedan",2021,425000],
["Volkswagen","Golf","sedan",2021,420000],["BMW","X3","suv",2022,895000],["Audi","Q3","suv",2022,775000],["Mercedes-Benz","GLE","suv",2021,1390000],["Porsche","Panamera","sedan",2021,1750000],
["Ram","1500","camioneta",2022,890000]
];

const vehicles = vehiclesData.map((v, i) => ({
  id: i + 1, marca: v[0], modelo: v[1], tipo: v[2], anio: v[3], precio: v[4],
  // Fotografía real consultada por marca/modelo en Wikimedia Commons mediante CarAPI.
  // La API devuelve también autor y licencia para mostrar los créditos correspondientes.
  img: `https://carapi.trustcar.info/getImage?make=${encodeURIComponent(v[0])}&model=${encodeURIComponent(v[1])}&year=${v[3]}`
}));

const $ = (id) => document.getElementById(id);
const carGrid = $("car-grid"), buscador = $("buscador"), filtro = $("filtro"), ordenPrecio = $("ordenPrecio");
const money = (n) => new Intl.NumberFormat("es-MX", {style:"currency", currency:"MXN", maximumFractionDigits:0}).format(n);
let selectedVehicle = null;
let authMode = "login";

function renderVehicles(list) {
  carGrid.innerHTML = "";
  $("sin-resultados").hidden = list.length !== 0;
  $("contadorAutos").textContent = `${list.length} ${list.length === 1 ? "vehículo" : "vehículos"}`;

  const fragment = document.createDocumentFragment();

  // Se conserva el índice original de cada vehículo para que su imagen alternativa
  // tenga un diseño/color único y nunca se repita una foto genérica.
  list.forEach(auto => {
    const originalIndex = auto.id - 1;
    const card = document.createElement("article");
    card.className = "car-card";
    card.innerHTML = `
      <div class="car-image-wrap">
        <img class="car-photo"
          src="${auto.img}"
          alt="Fotografía del ${escapeHtml(auto.marca)} ${escapeHtml(auto.modelo)}"
          loading="lazy">
        <span class="photo-credit" aria-live="polite"></span>
        <span class="car-type">${auto.tipo.toUpperCase()}</span>
      </div>
      <div class="car-info">
        <p class="eyebrow">${auto.anio} · TORRES MOTORS</p>
        <h3>${escapeHtml(auto.marca)} ${escapeHtml(auto.modelo)}</h3>
        <p class="car-details">Año ${auto.anio} · Consulta kilometraje y transmisión con un asesor.</p>
        <div class="car-bottom">
          <p class="price">${money(auto.precio)}</p>
          <button class="btn btn-dark contactar" type="button" data-id="${auto.id}">
            Me interesa <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>`;

    const photo = card.querySelector(".car-photo");
    const credit = card.querySelector(".photo-credit");
    photo.addEventListener("error", () => {
      // Si Wikimedia no tiene una foto para ese modelo, se conserva el respaldo individual.
      photo.src = createVehicleFallback(auto, originalIndex);
      photo.classList.add("car-photo-fallback");
      credit.textContent = "Fotografía no disponible";
    }, { once: true });

    // Consultamos primero los metadatos para respetar autoría y licencia de cada fotografía.
    loadVehiclePhoto(auto, photo, credit);
    fragment.appendChild(card);
  });

  carGrid.appendChild(fragment);
}


async function loadVehiclePhoto(auto, photo, credit) {
  const base = "https://carapi.trustcar.info/getImage";
  const params = new URLSearchParams({ make: auto.marca, model: auto.modelo, year: auto.anio, format: "json" });

  try {
    let response = await fetch(`${base}?${params.toString()}`);
    let data = response.ok ? await response.json() : { found: false };

    // Si no existe una foto asociada a ese año exacto, intentamos por marca y modelo.
    if (!data.found) {
      params.delete("year");
      response = await fetch(`${base}?${params.toString()}`);
      data = response.ok ? await response.json() : { found: false };
    }

    if (data.found && data.image_url) {
      photo.src = data.image_url;
      photo.alt = `Fotografía real de ${auto.marca} ${auto.modelo}${data.year ? ` ${data.year}` : ""}`;
      credit.textContent = data.attribution || `Fotografía: ${data.title || auto.marca + " " + auto.modelo} · Wikimedia Commons`;
      credit.title = `Licencia: ${data.license || "consultar fuente"}`;
    } else {
      photo.src = createVehicleFallback(auto, auto.id - 1);
      photo.classList.add("car-photo-fallback");
      credit.textContent = "Foto real no encontrada; imagen ilustrativa";
    }
  } catch (error) {
    // Si el servicio no está disponible, mostramos el respaldo y no rompemos el catálogo.
    photo.src = createVehicleFallback(auto, auto.id - 1);
    photo.classList.add("car-photo-fallback");
    credit.textContent = "No se pudo cargar la fotografía";
  }
}

function createVehicleFallback(auto, index) {
  const hue = (index * 37 + 198) % 360;
  const safeLabel = `${auto.marca} ${auto.modelo}`
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyColor = ["#f4f4f0", "#c7d0d9", "#d7b36a", "#9aa8b5", "#e3e3e3"][index % 5];
  const vehicleShape = auto.tipo === "camioneta"
    ? "M105 245 L155 160 H475 L555 220 H650 L690 280 V320 H75 V275 Z"
    : auto.tipo === "suv"
      ? "M95 245 L145 145 Q160 120 220 115 H475 Q525 120 565 185 L635 235 Q665 250 665 290 V320 H65 V280 Q65 250 95 245 Z"
      : "M85 250 L160 185 Q190 145 245 140 H455 Q510 145 555 205 L635 245 Q660 260 660 295 V320 H65 V285 Q65 260 85 250 Z";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="hsl(${hue},48%,22%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360},58%,48%)"/>
      </linearGradient>
      <linearGradient id="car" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#ffffff"/><stop offset="1" stop-color="${bodyColor}"/>
      </linearGradient>
    </defs>
    <rect width="900" height="600" fill="url(#bg)"/>
    <circle cx="735" cy="105" r="75" fill="#fff" opacity=".13"/>
    <path d="M0 390 Q450 335 900 390 V600 H0Z" fill="#101820" opacity=".42"/>
    <g transform="translate(75 105)">
      <path d="${vehicleShape}" fill="url(#car)" stroke="#18212b" stroke-width="12" stroke-linejoin="round"/>
      <path d="M180 175 L225 130 H455 Q495 135 535 205 H145Z" fill="#263b4b"/>
      <path d="M145 225 H625" stroke="#64748b" stroke-width="8"/>
      <circle cx="190" cy="315" r="58" fill="#111827"/><circle cx="190" cy="315" r="27" fill="#cbd5e1"/>
      <circle cx="545" cy="315" r="58" fill="#111827"/><circle cx="545" cy="315" r="27" fill="#cbd5e1"/>
      <rect x="80" y="255" width="65" height="20" rx="8" fill="#fff2c2"/>
      <rect x="625" y="255" width="48" height="20" rx="8" fill="#ffc4c4"/>
    </g>
    <text x="450" y="510" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff">${safeLabel}</text>
    <text x="450" y="552" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="#fff" opacity=".88">Imagen ilustrativa · TORRES MOTORS</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function filterVehicles() {
  const query = buscador.value.trim().toLocaleLowerCase("es");
  let list = vehicles.filter(v => (`${v.marca} ${v.modelo} ${v.tipo}`).toLocaleLowerCase("es").includes(query) &&
    (filtro.value === "todos" || v.tipo === filtro.value));
  if (ordenPrecio.value === "menor") list.sort((a,b)=>a.precio-b.precio);
  if (ordenPrecio.value === "mayor") list.sort((a,b)=>b.precio-a.precio);
  renderVehicles(list);
}
buscador.addEventListener("input", filterVehicles);
filtro.addEventListener("change", filterVehicles);
ordenPrecio.addEventListener("change", filterVehicles);
carGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".contactar");
  if (btn) openReservation(Number(btn.dataset.id));
});

// Tema claro / oscuro
const root = document.documentElement;
function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("torres_theme", theme);
  $("themeToggle").innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i><span>Modo día</span>' : '<i class="fa-solid fa-moon"></i><span>Modo noche</span>';
  $("themeToggle").setAttribute("aria-label", theme === "dark" ? "Cambiar a modo día" : "Cambiar a modo noche");
}
setTheme(localStorage.getItem("torres_theme") || "light");
$("themeToggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

// Menú móvil
$("menuToggle").addEventListener("click", () => {
  const open = $("mainNav").classList.toggle("open");
  $("menuToggle").setAttribute("aria-expanded", String(open));
  $("menuToggle").innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
});
$("mainNav").querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  $("mainNav").classList.remove("open"); $("menuToggle").setAttribute("aria-expanded","false");
  $("menuToggle").innerHTML = '<i class="fa-solid fa-bars"></i>';
}));

// Cuenta local de demostración. No sustituye autenticación segura de servidor.
function getUsers(){ try{return JSON.parse(localStorage.getItem("torres_users") || "[]");}catch{return [];} }
function currentUser(){return localStorage.getItem("torres_user") || "";}
function updateHeaderAuth(){
  const user = currentUser();
  $("btnLoginHeader").innerHTML = user ? `<i class="fa-solid fa-user-check"></i> ${escapeHtml(user)} · Salir` : '<i class="fa-solid fa-user"></i> Iniciar sesión';
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openAuth(mode="login"){
  authMode=mode; $("authError").textContent="";
  $("loginModal").hidden=false; document.body.classList.add("modal-open"); updateAuthMode();
}
function closeModal(modal){modal.hidden=true;document.body.classList.remove("modal-open");}
function updateAuthMode(){
  $("tabLogin").classList.toggle("active",authMode==="login"); $("tabRegister").classList.toggle("active",authMode==="register");
  $("authTitle").textContent=authMode==="login"?"Bienvenido":"Crea tu cuenta";
  $("authSubmit").textContent=authMode==="login"?"Ingresar":"Crear cuenta";
  $("nameField").hidden=authMode!=="register";
  $("fullName").required=authMode==="register";
}
$("btnLoginHeader").addEventListener("click",()=>{
  if(currentUser()){localStorage.removeItem("torres_user");updateHeaderAuth();toast("Sesión cerrada.");}
  else openAuth("login");
});
$("tabLogin").addEventListener("click",()=>{authMode="login";updateAuthMode();});
$("tabRegister").addEventListener("click",()=>{authMode="register";updateAuthMode();});
$("loginForm").addEventListener("submit",e=>{
  e.preventDefault(); $("authError").textContent="";
  const email=$("email").value.trim().toLowerCase(), password=$("password").value;
  const users=getUsers();
  if(authMode==="register"){
    const name=$("fullName").value.trim();
    if(users.some(u=>u.email===email)){ $("authError").textContent="Ese correo ya está registrado en este navegador.";return; }
    users.push({name,email,password}); localStorage.setItem("torres_users",JSON.stringify(users));
    localStorage.setItem("torres_user",name);
  }else{
    const user=users.find(u=>u.email===email && u.password===password);
    if(!user){$("authError").textContent="Correo o contraseña incorrectos. Si es tu primera vez, crea una cuenta.";return;}
    localStorage.setItem("torres_user",user.name);
  }
  updateHeaderAuth();closeModal($("loginModal"));$("loginForm").reset();toast("¡Bienvenido a Torres Motors!");
});
updateHeaderAuth();

// Reservación y métodos de pago de demostración (sin cobros reales).
function renderPaymentInfo(){
  const method=$("metodoPago").value;
  const box=$("datosBancarios");
  if(method==="spei"){
    box.innerHTML=`<h3><i class="fa-solid fa-building-columns"></i> Datos bancarios de ejemplo</h3>
      <p><strong>Banco:</strong> Banco Demo Nacional</p>
      <p><strong>Beneficiario:</strong> Torres Motors — Cuenta ficticia</p>
      <p><strong>Cuenta:</strong> 1234567890</p>
      <p><strong>CLABE:</strong> 012345678901234567</p>
      <p><strong>Concepto:</strong> RESERVA-TORRES-DEMO</p>
      <small>Estos datos son inventados y solo sirven para mostrar cómo aparecería la información.</small>`;
  }else if(method==="tarjeta"){
    box.innerHTML=`<h3><i class="fa-regular fa-credit-card"></i> Pago con tarjeta</h3>
      <p>En una tienda real, el pago se haría mediante una pasarela segura.</p>
      <p><strong>Modo:</strong> Simulación académica</p>
      <small>No ingreses números de tarjeta, CVV ni datos bancarios reales en este proyecto.</small>`;
  }else{
    box.innerHTML=`<h3><i class="fa-solid fa-store"></i> Pago en tienda</h3>
      <p><strong>Referencia de ejemplo:</strong> TM-DEMO-5000</p>
      <p>En una operación real se generaría una ficha de pago válida desde un proveedor autorizado.</p>
      <small>Esta referencia es ficticia y no puede utilizarse para pagar en OXXO.</small>`;
  }
}
$("metodoPago").addEventListener("change",renderPaymentInfo);
renderPaymentInfo();
function openReservation(id){
  selectedVehicle=vehicles.find(v=>v.id===id);
  if(!selectedVehicle)return;
  if(!currentUser()){openAuth("login");toast("Inicia sesión para continuar con la reservación.");return;}
  $("pagoDetalle").innerHTML=`<p><strong>Vehículo:</strong> ${escapeHtml(selectedVehicle.marca)} ${escapeHtml(selectedVehicle.modelo)} (${selectedVehicle.anio})</p>
    <p><strong>Precio de referencia:</strong> ${money(selectedVehicle.precio)}</p>
    <p><strong>Anticipo:</strong> <span class="price">${money(5000)}</span></p>`;
  $("aceptaTerminos").checked=false;$("paymentError").textContent="";
  $("metodoPago").value="spei";renderPaymentInfo();
  $("pagoModal").hidden=false;document.body.classList.add("modal-open");
}
$("btnPagar").addEventListener("click",()=>{
  if(!selectedVehicle)return;
  if(!$("aceptaTerminos").checked){$("paymentError").textContent="Debes aceptar las condiciones para continuar.";return;}
  const sale={folio:"TM-"+Date.now().toString().slice(-8),vehiculo:`${selectedVehicle.marca} ${selectedVehicle.modelo} ${selectedVehicle.anio}`,anticipo:5000,metodo:$("metodoPago").selectedOptions[0].text,cliente:currentUser(),estado:"Demostración: no se realizó ningún cobro",fecha:new Date().toLocaleString("es-MX")};
  const sales=JSON.parse(localStorage.getItem("torres_ventas")||"[]");sales.push(sale);localStorage.setItem("torres_ventas",JSON.stringify(sales));
  $("paymentError").textContent="";
  alert(`¡Simulación completada!\nFolio: ${sale.folio}\nVehículo: ${sale.vehiculo}\nAnticipo: ${money(sale.anticipo)}\nMétodo: ${sale.metodo}\n\nNo se realizó ningún cobro ni transferencia real.`);
  closeModal($("pagoModal"));toast("Comprobante de demostración guardado en este navegador.");
});
// Cambia el número por el WhatsApp real de la agencia, con código de país y sin +.
const WHATSAPP_NUMBER = "5215512345678";
$("btnWhatsApp").addEventListener("click",()=>{
  if(!selectedVehicle)return;
  const msg=`Hola, me interesa el ${selectedVehicle.marca} ${selectedVehicle.modelo} ${selectedVehicle.anio}. ¿Me pueden informar sobre disponibilidad y condiciones de reservación?`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");
});

// Cierre de modales
document.querySelectorAll(".close-modal").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.closest(".modal"))));
[$("loginModal"),$("pagoModal")].forEach(modal=>modal.addEventListener("click",e=>{if(e.target===modal)closeModal(modal);}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")[$("loginModal"),$("pagoModal")].forEach(m=>{if(!m.hidden)closeModal(m);});});

// Chat de respuestas frecuentes
function addMessage(text,type){
  const div=document.createElement("div");div.className=`msg-${type}`;div.textContent=text;$("chatMessages").appendChild(div);$("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}
$("chatBubble").addEventListener("click",()=>{$("chatWindow").hidden=!$("chatWindow").hidden;});
$("closeChat").addEventListener("click",()=>$("chatWindow").hidden=true);
$("chatForm").addEventListener("submit",e=>{
  e.preventDefault();const text=$("chatInput").value.trim();if(!text)return;
  addMessage(text,"user");$("chatInput").value="";
  const t=text.toLowerCase();let answer="Gracias por escribirnos. Para confirmar disponibilidad, documentación y condiciones, contacta a un asesor de ventas.";
  if(t.includes("precio")||t.includes("costo"))answer="Los precios publicados son de referencia. Selecciona “Me interesa” en un vehículo para consultar el anticipo y hablar con ventas.";
  else if(t.includes("horario"))answer="El horario de atención de ejemplo es lunes a sábado de 9:00 a 19:00. Confirma el horario vigente con la agencia.";
  else if(t.includes("pago")||t.includes("tarjeta"))answer="El pago de tarjeta se realiza en una página segura de Stripe cuando el servidor de pagos está configurado.";
  else if(t.includes("ubicación")||t.includes("direccion"))answer="Agrega la dirección oficial de Torres Motors en la sección de contacto para que podamos compartirla.";
  window.setTimeout(()=>addMessage(answer,"bot"),500);
});

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");window.setTimeout(()=>el.classList.remove("show"),2600);}
$("year").textContent=new Date().getFullYear();
renderVehicles(vehicles);

// Stripe regresa a esta página con ?pago=exitoso o ?pago=cancelado.
// La confirmación definitiva debe validarse en servidor mediante webhook.
const params=new URLSearchParams(location.search);
if(params.get("pago")==="exitoso")toast("Stripe completó el flujo. La agencia debe validar el pago mediante webhook.");
if(params.get("pago")==="cancelado")toast("El pago fue cancelado; no se realizó el cobro.");
