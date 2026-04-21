/* ==========================================================
   🌸 ROMPECABEZAS — script.js
   Las fotos vienen de fotos.js (generado con generar.bat)
   ========================================================== */

/* ── Estado global ── */
let size       = 3;
let pieces     = [];
let emptyIndex = size * size - 1;
let imageURL   = "";
let pieceW     = 0;
let pieceH     = 0;

/* ── Referencias DOM ── */
const galleryEl    = document.getElementById("gallery");
const puzzleEl     = document.getElementById("puzzle");
const winMsg       = document.getElementById("winMsg");
const galleryLabel = document.getElementById("galleryLabel");
const galleryCard  = document.getElementById("galleryCard");
const dropZone     = document.getElementById("dropZone");

/* ── Cargar fotos desde fotos.js al arrancar ── */
function cargarFotosCarpeta() {
  // FOTOS es el array definido en fotos.js
  // Si fotos.js no existe o está vacío, simplemente no hay fotos precargadas
  if (typeof FOTOS === "undefined" || FOTOS.length === 0) {
    console.info("No hay fotos precargadas. Sube fotos manualmente.");
    return;
  }

  FOTOS.forEach((foto, i) => {
    // Compatibilidad: fotos.js puede tener objetos {nombre, src} o strings directos
    const src    = typeof foto === "string" ? foto : foto.src;
    const nombre = typeof foto === "string" ? ("Foto " + (i + 1)) : foto.nombre;
    addImg(src, nombre, i === 0); // auto-seleccionar solo la primera
  });
}

/* ── Añadir imagen a la galería ── */
function addImg(src, nombre, autoSelect) {
  galleryLabel.style.display = "";
  galleryCard.style.display  = "";

  const wrap = document.createElement("div");
  wrap.classList.add("thumb-wrap");
  wrap.title = nombre || "";

  const img = document.createElement("img");
  img.src = src;
  img.classList.add("thumb");
  img.alt = nombre || "";
  img.onclick = () => selectImage(src, img);

  const del = document.createElement("button");
  del.classList.add("thumb-del");
  del.textContent = "×";
  del.title = "Quitar";
  del.onclick = (e) => {
    e.stopPropagation();
    wrap.remove();
    if (imageURL === src) {
      imageURL = "";
      puzzleEl.innerHTML = `
        <div class="empty-state">
          <span class="big">💕</span>
          Elige otra foto
        </div>`;
      winMsg.classList.remove("show");
    }
    if (galleryEl.children.length === 0) {
      galleryLabel.style.display = "none";
      galleryCard.style.display  = "none";
    }
  };

  wrap.appendChild(img);
  wrap.appendChild(del);
  galleryEl.appendChild(wrap);

  if (autoSelect) selectImage(src, img);
}

/* ── Seleccionar imagen ── */
function selectImage(src, imgEl) {
  document.querySelectorAll(".thumb").forEach(t => t.classList.remove("selected"));
  imgEl.classList.add("selected");
  imageURL = src;
  winMsg.classList.remove("show");
  createPuzzle();
}

/* ── Zona de subida ── */
dropZone.addEventListener("click", () => document.getElementById("upload").click());

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  Array.from(e.dataTransfer.files)
    .filter(f => f.type.startsWith("image/"))
    .forEach(f => addImg(URL.createObjectURL(f), f.name, false));
});

document.getElementById("upload").addEventListener("change", function (e) {
  Array.from(e.target.files).forEach(f =>
    addImg(URL.createObjectURL(f), f.name, galleryEl.children.length === 0)
  );
  e.target.value = "";
});

/* ── Cambiar tamaño ── */
function changeSize(n) {
  size = n;
  emptyIndex = size * size - 1;
  ["3", "4", "5"].forEach(x =>
    document.getElementById("btn" + x).classList.remove("active")
  );
  document.getElementById("btn" + n).classList.add("active");
  if (imageURL) { winMsg.classList.remove("show"); createPuzzle(); }
}

/* ── Ancho máximo disponible ── */
function getMaxWidth() {
  return document.getElementById("puzzleWrapper").clientWidth - 28;
}

/* ── Crear puzzle ── */
function createPuzzle() {
  if (!imageURL) return;

  const img = new Image();
  img.src = imageURL;

  img.onload = () => {
    const aspect = img.width / img.height;
    const maxW   = getMaxWidth();
    const maxH   = Math.floor(window.innerHeight * 0.72);

    let finalW, finalH;

    if (img.width <= maxW && img.height <= maxH) {
      finalW = img.width;
      finalH = img.height;
    } else if (aspect >= 1) {
      finalW = maxW;
      finalH = finalW / aspect;
      if (finalH > maxH) { finalH = maxH; finalW = finalH * aspect; }
    } else {
      finalH = maxH;
      finalW = finalH * aspect;
      if (finalW > maxW) { finalW = maxW; finalH = finalW / aspect; }
    }

    // Múltiplo exacto de size → piezas perfectas sin píxeles sueltos
    pieceW = Math.floor(finalW / size);
    pieceH = Math.floor(finalH / size);
    const gridW = pieceW * size;
    const gridH = pieceH * size;

    puzzleEl.style.gridTemplateColumns = `repeat(${size}, ${pieceW}px)`;
    puzzleEl.style.gridTemplateRows    = `repeat(${size}, ${pieceH}px)`;
    puzzleEl.style.width  = gridW + "px";
    puzzleEl.style.height = gridH + "px";
    puzzleEl.innerHTML = "";
    pieces     = [];
    emptyIndex = size * size - 1;

    for (let i = 0; i < size * size; i++) {
      const div = document.createElement("div");
      div.classList.add("piece");
      div.style.width  = pieceW + "px";
      div.style.height = pieceH + "px";

      if (i === emptyIndex) {
        div.classList.add("empty");
      } else {
        const x = i % size;
        const y = Math.floor(i / size);
        div.style.backgroundImage    = `url(${imageURL})`;
        div.style.backgroundSize     = `${gridW}px ${gridH}px`;
        div.style.backgroundPosition = `-${x * pieceW}px -${y * pieceH}px`;
      }

      div.addEventListener("click", () => movePiece(i));
      pieces.push(div);
      puzzleEl.appendChild(div);
    }
  };
}

/* ── Movimiento ── */
function movePiece(index) {
  const ns = getNeighbors(emptyIndex);
  if (ns.includes(index)) {
    swap(index, emptyIndex);
    emptyIndex = index;
    checkWin();
  }
}

function getNeighbors(index) {
  const ns = [], x = index % size, y = Math.floor(index / size);
  if (x > 0)         ns.push(index - 1);
  if (x < size - 1)  ns.push(index + 1);
  if (y > 0)         ns.push(index - size);
  if (y < size - 1)  ns.push(index + size);
  return ns;
}

function swap(i, j) {
  const tBg  = pieces[i].style.backgroundImage;
  const tPos = pieces[i].style.backgroundPosition;
  pieces[i].style.backgroundImage    = pieces[j].style.backgroundImage;
  pieces[i].style.backgroundPosition = pieces[j].style.backgroundPosition;
  pieces[j].style.backgroundImage    = tBg;
  pieces[j].style.backgroundPosition = tPos;
  pieces[i].classList.toggle("empty");
  pieces[j].classList.toggle("empty");
}

/* ── Mezclar ── */
function shuffle() {
  if (!imageURL) return;
  winMsg.classList.remove("show");
  const moves = size === 3 ? 100 : size === 4 ? 200 : 350;
  for (let i = 0; i < moves; i++) {
    const ns   = getNeighbors(emptyIndex);
    const rand = ns[Math.floor(Math.random() * ns.length)];
    swap(rand, emptyIndex);
    emptyIndex = rand;
  }
}

/* ── Victoria ── */
function checkWin() {
  for (let i = 0; i < size * size; i++) {
    const p = pieces[i];
    if (i === size * size - 1) {
      if (!p.classList.contains("empty")) return;
      continue;
    }
    if (p.classList.contains("empty")) return;
    const x = i % size, y = Math.floor(i / size);
    const expected = `-${x * pieceW}px -${y * pieceH}px`;
    if (p.style.backgroundPosition.replace(/\s+/g, " ").trim() !== expected) return;
  }
  winMsg.classList.add("show");
  winMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ── Responsive ── */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (imageURL) createPuzzle(); }, 200);
});

/* ── Iniciar ── */
cargarFotosCarpeta();
