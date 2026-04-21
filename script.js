/* ==========================================================
   🌸 ROMPECABEZAS — script.js
   Mecánica: toca una pieza para levantarla, toca otra para
   intercambiarla. Galería bloqueada hasta completar cada foto.
   ========================================================== */

/* ── Estado ── */
let size        = 3;
let pieces      = [];       // divs del puzzle en orden visual actual
let positions   = [];       // posición lógica de cada celda (qué pieza hay)
let emptyIndex  = 0;        // índice de la celda vacía
let liftedIdx   = null;     // celda levantada actualmente
let imageURL    = "";
let currentFotoIdx = -1;
let pieceW = 0, pieceH = 0;

// Progreso: qué fotos han sido completadas
const completadas = new Set(
  JSON.parse(localStorage.getItem("puzzle_completadas") || "[]")
);

/* ── DOM ── */
const galleryEl   = document.getElementById("gallery");
const puzzleEl    = document.getElementById("puzzle");
const winMsg      = document.getElementById("winMsg");
const boardLabel  = document.getElementById("boardLabel");
const overlay     = document.getElementById("revealOverlay");
const revealImg   = document.getElementById("revealImg");

/* ── Construir galería al cargar ── */
window.addEventListener("load", () => {
  if (typeof FOTOS === "undefined" || FOTOS.length === 0) {
    galleryEl.innerHTML = "<p style='color:var(--text-s);font-size:.85rem'>No se encontraron fotos en fotos.js</p>";
    return;
  }
  FOTOS.forEach((foto, i) => {
    const src    = typeof foto === "string" ? foto : foto.src;
    const nombre = typeof foto === "string" ? ("Foto " + (i+1)) : foto.nombre;
    crearAlbumItem(src, nombre, i);
  });
});

function crearAlbumItem(src, nombre, idx) {
  const item = document.createElement("div");
  item.classList.add("album-item");
  item.dataset.idx = idx;
  if (completadas.has(idx)) item.classList.add("unlocked");

  // Imagen real (siempre cargada pero oculta bajo la carátula si no está desbloqueada)
  const img = document.createElement("img");
  img.classList.add("album-img");
  img.src = src;
  img.alt = nombre;
  // Si no está desbloqueada, ocultamos la imagen visualmente con la carátula encima
  if (!completadas.has(idx)) img.style.filter = "blur(20px) brightness(0.3)";

  // Carátula bloqueada
  const lock = document.createElement("div");
  lock.classList.add("album-lock");
  lock.innerHTML = `
    <span class="lock-icon">🔒</span>
    <span class="lock-num">${nombre}</span>
  `;

  // Badge "¡Lista!"
  const badge = document.createElement("div");
  badge.classList.add("album-badge");
  badge.textContent = "✓ Lista";

  item.appendChild(img);
  if (!completadas.has(idx)) item.appendChild(lock);
  item.appendChild(badge);

  item.addEventListener("click", () => seleccionarFoto(src, nombre, idx, item));
  galleryEl.appendChild(item);
}

/* ── Seleccionar foto del álbum ── */
function seleccionarFoto(src, nombre, idx, itemEl) {
  document.querySelectorAll(".album-item").forEach(el => el.classList.remove("active"));
  itemEl.classList.add("active");
  imageURL       = src;
  currentFotoIdx = idx;
  boardLabel.textContent = nombre;
  winMsg.classList.remove("show");
  liftedIdx = null;
  createPuzzle();
}

/* ── Cambiar tamaño ── */
function changeSize(n) {
  size = n;
  ["3","4","5"].forEach(x => document.getElementById("btn"+x).classList.remove("active"));
  document.getElementById("btn"+n).classList.add("active");
  if (imageURL) { winMsg.classList.remove("show"); liftedIdx = null; createPuzzle(); }
}

/* ── Ancho disponible ── */
function getMaxWidth() {
  return document.getElementById("puzzleWrapper").clientWidth - 32;
}

/* ── Crear puzzle ── */
function createPuzzle() {
  if (!imageURL) return;

  const img = new Image();
  img.src = imageURL;
  img.onload = () => {
    const aspect = img.width / img.height;
    const maxW   = getMaxWidth();
    const maxH   = Math.floor(window.innerHeight * 0.68);

    let finalW, finalH;
    if (img.width <= maxW && img.height <= maxH) {
      finalW = img.width; finalH = img.height;
    } else if (aspect >= 1) {
      finalW = maxW; finalH = finalW / aspect;
      if (finalH > maxH) { finalH = maxH; finalW = finalH * aspect; }
    } else {
      finalH = maxH; finalW = finalH * aspect;
      if (finalW > maxW) { finalW = maxW; finalH = finalW / aspect; }
    }

    pieceW = Math.floor(finalW / size);
    pieceH = Math.floor(finalH / size);
    const gridW = pieceW * size;
    const gridH = pieceH * size;

    puzzleEl.style.gridTemplateColumns = `repeat(${size}, ${pieceW}px)`;
    puzzleEl.style.gridTemplateRows    = `repeat(${size}, ${pieceH}px)`;
    puzzleEl.style.width  = gridW + "px";
    puzzleEl.style.height = gridH + "px";
    puzzleEl.innerHTML = "";
    pieces    = [];
    positions = [];
    liftedIdx = null;
    emptyIndex = size * size - 1;

    // positions[celda] = índice lógico de pieza (emptyIndex = pieza vacía)
    for (let i = 0; i < size * size; i++) positions.push(i);

    shufflePuzzle();
  };
}

/* ── Renderizar piezas según positions[] ── */
function renderPieces(gridW, gridH) {
  puzzleEl.innerHTML = "";
  pieces = [];

  for (let celda = 0; celda < size * size; celda++) {
    const pieza = positions[celda];
    const div   = document.createElement("div");
    div.classList.add("piece");
    div.style.width  = pieceW + "px";
    div.style.height = pieceH + "px";

    if (pieza === emptyIndex) {
      div.classList.add("empty");
    } else {
      const x = pieza % size;
      const y = Math.floor(pieza / size);
      div.style.backgroundImage    = `url(${imageURL})`;
      div.style.backgroundSize     = `${gridW}px ${gridH}px`;
      div.style.backgroundPosition = `-${x * pieceW}px -${y * pieceH}px`;

      // Marcar si está en posición correcta
      if (pieza === celda) div.classList.add("correct");
    }

    div.addEventListener("click", () => handleClick(celda));
    div.addEventListener("touchend", (e) => { e.preventDefault(); handleClick(celda); });
    pieces.push(div);
    puzzleEl.appendChild(div);
  }
}

/* ── Lógica de click: levantar / intercambiar ── */
function handleClick(celda) {
  const esVacia = positions[celda] === emptyIndex;

  // Si no hay pieza levantada
  if (liftedIdx === null) {
    if (esVacia) return; // no se puede levantar el hueco
    liftedIdx = celda;
    pieces[celda].classList.add("lifted");
    // Marcar vecinos válidos como target
    getNeighbors(celda).forEach(n => {
      if (positions[n] === emptyIndex) pieces[n].classList.add("target");
    });
    return;
  }

  // Si se toca la misma pieza levantada → bajar
  if (liftedIdx === celda) {
    bajarPieza();
    return;
  }

  // Si se toca otra pieza o el hueco → intentar mover
  const ns = getNeighbors(liftedIdx);

  if (ns.includes(celda) && positions[celda] === emptyIndex) {
    // Mover: intercambiar pieza levantada con el hueco
    intercambiar(liftedIdx, celda);
    liftedIdx = null;
    checkWin();
  } else if (!esVacia) {
    // Levantar otra pieza distinta
    bajarPieza();
    liftedIdx = celda;
    pieces[celda].classList.add("lifted");
    getNeighbors(celda).forEach(n => {
      if (positions[n] === emptyIndex) pieces[n].classList.add("target");
    });
  } else {
    // Hueco no adyacente → bajar
    bajarPieza();
  }
}

function bajarPieza() {
  if (liftedIdx === null) return;
  pieces[liftedIdx].classList.remove("lifted");
  pieces.forEach(p => p.classList.remove("target"));
  liftedIdx = null;
}

/* ── Intercambiar dos celdas en positions[] y DOM ── */
function intercambiar(celdaA, celdaB) {
  // Intercambiar en el array lógico
  [positions[celdaA], positions[celdaB]] = [positions[celdaB], positions[celdaA]];

  // Actualizar emptyIndex (celda donde quedó el hueco)
  emptyIndex = emptyIndex; // emptyIndex es el índice LÓGICO, no cambia
  // Actualizar qué celda tiene el hueco visualmente
  const gridW = pieceW * size;
  const gridH = pieceH * size;

  // Redibuja solo las dos celdas intercambiadas
  [celdaA, celdaB].forEach(celda => {
    const div   = pieces[celda];
    const pieza = positions[celda];

    div.classList.remove("empty","correct","lifted","target");

    if (pieza === size * size - 1) {
      // Es el hueco
      div.classList.add("empty");
      div.style.backgroundImage = "";
      div.style.backgroundPosition = "";
    } else {
      const x = pieza % size;
      const y = Math.floor(pieza / size);
      div.style.backgroundImage    = `url(${imageURL})`;
      div.style.backgroundSize     = `${gridW}px ${gridH}px`;
      div.style.backgroundPosition = `-${x * pieceW}px -${y * pieceH}px`;
      if (pieza === celda) div.classList.add("correct");
    }
  });
}

/* ── Vecinos ── */
function getNeighbors(celda) {
  const ns = [], x = celda % size, y = Math.floor(celda / size);
  if (x > 0)         ns.push(celda - 1);
  if (x < size - 1)  ns.push(celda + 1);
  if (y > 0)         ns.push(celda - size);
  if (y < size - 1)  ns.push(celda + size);
  return ns;
}

/* ── Mezclar ── */
function shufflePuzzle() {
  if (!imageURL) return;
  winMsg.classList.remove("show");
  liftedIdx = null;

  // Resetear posiciones
  for (let i = 0; i < size * size; i++) positions[i] = i;
  // Encontrar celda del hueco lógico (última pieza)
  let huecoCell = size * size - 1;

  const moves = size === 3 ? 120 : size === 4 ? 250 : 400;
  for (let i = 0; i < moves; i++) {
    const ns   = getNeighbors(huecoCell);
    const rand = ns[Math.floor(Math.random() * ns.length)];
    [positions[huecoCell], positions[rand]] = [positions[rand], positions[huecoCell]];
    huecoCell = rand;
  }

  const gridW = pieceW * size, gridH = pieceH * size;
  renderPieces(gridW, gridH);
}

/* ── Verificar victoria ── */
function checkWin() {
  for (let i = 0; i < size * size; i++) {
    if (positions[i] !== i) return;
  }
  // ¡Ganó!
  winMsg.classList.add("show");
  winMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Desbloquear foto si no estaba desbloqueada
  if (!completadas.has(currentFotoIdx)) {
    completadas.add(currentFotoIdx);
    localStorage.setItem("puzzle_completadas", JSON.stringify([...completadas]));
    desbloquearEnGaleria(currentFotoIdx);

    // Mostrar overlay de revelación con un pequeño delay
    setTimeout(() => mostrarReveal(imageURL), 600);
  }
}

/* ── Desbloquear ítem en galería ── */
function desbloquearEnGaleria(idx) {
  const item = galleryEl.querySelector(`[data-idx="${idx}"]`);
  if (!item) return;
  item.classList.add("unlocked");
  const img  = item.querySelector(".album-img");
  const lock = item.querySelector(".album-lock");
  if (img)  img.style.filter = "";
  if (lock) { lock.style.opacity = "0"; setTimeout(() => lock.remove(), 500); }
}

/* ── Overlay de revelación ── */
function mostrarReveal(src) {
  revealImg.src = src;
  overlay.classList.add("show");
}

function closeReveal() {
  overlay.classList.remove("show");
}

/* ── Responsive ── */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (imageURL) { liftedIdx = null; createPuzzle(); } }, 220);
});
/* ── Iniciar ── */
cargarFotosCarpeta();
