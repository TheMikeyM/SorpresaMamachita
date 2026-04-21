/* ==========================================================
   🌸 ROMPECABEZAS — script.js
   ==========================================================
   ► PARA AÑADIR FOTOS DE LA CARPETA "fotitos":
     Edita el array FOTITOS_CARPETA de abajo con el nombre
     exacto de cada archivo que tengas en /fotitos/

     Ejemplo:
       const FOTITOS_CARPETA = [
         "fotitos/cumple.jpg",
         "fotitos/playa.png",
         "fotitos/navidad.jpg",
       ];
   ========================================================== */

const FOTITOS_CARPETA = [
  "fotitos/foto1.jpg",
  "fotitos/foto2.jpg",
  "fotitos/foto3.jpg",
];

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

/* ── Cargar fotos de la carpeta al inicio ── */
function cargarFotosCarpeta() {
  FOTITOS_CARPETA.forEach(src => {
    // Verificar que la imagen existe antes de mostrarla
    const tester = new Image();
    tester.onload  = () => addImg(src, false); // false = no auto-seleccionar cada una
    tester.onerror = () => console.warn(`No se encontró: ${src}`);
    tester.src = src;
  });
}

/* ── Añadir imagen a la galería ── */
let primeraImg = true; // para auto-seleccionar solo la primera

function addImg(src, autoSelect = true) {
  galleryLabel.style.display = "";
  galleryCard.style.display  = "";

  const wrap = document.createElement("div");
  wrap.classList.add("thumb-wrap");

  const img = document.createElement("img");
  img.src = src;
  img.classList.add("thumb");
  img.onclick = () => selectImage(src, img);

  const del = document.createElement("button");
  del.classList.add("thumb-del");
  del.textContent = "×";
  del.title = "Eliminar";
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

  // Auto-seleccionar la primera imagen que se cargue
  if (primeraImg || autoSelect) {
    primeraImg = false;
    selectImage(src, img);
  }
}

/* ── Seleccionar imagen ── */
function selectImage(src, imgEl) {
  document.querySelectorAll(".thumb").forEach(t => t.classList.remove("selected"));
  imgEl.classList.add("selected");
  imageURL = src;
  winMsg.classList.remove("show");
  createPuzzle();
}

/* ── Zona de subida (clic) ── */
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
    .forEach(f => addImg(URL.createObjectURL(f)));
});

document.getElementById("upload").addEventListener("change", function (e) {
  Array.from(e.target.files).forEach(f => addImg(URL.createObjectURL(f)));
  e.target.value = "";
});

/* ── Cambiar tamaño del puzzle ── */
function changeSize(n) {
  size = n;
  emptyIndex = size * size - 1;
  ["3", "4", "5"].forEach(x =>
    document.getElementById("btn" + x).classList.remove("active")
  );
  document.getElementById("btn" + n).classList.add("active");
  if (imageURL) {
    winMsg.classList.remove("show");
    createPuzzle();
  }
}

/* ── Calcular ancho máximo disponible ── */
function getMaxWidth() {
  const wrapper = document.getElementById("puzzleWrapper");
  return wrapper.clientWidth - 28; // 14px padding a cada lado
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

    // Redondear al múltiplo exacto de size para piezas perfectas
    pieceW = Math.floor(finalW / size);
    pieceH = Math.floor(finalH / size);
    const gridW = pieceW * size;
    const gridH = pieceH * size;

    puzzleEl.style.gridTemplateColumns = `repeat(${size}, ${pieceW}px)`;
    puzzleEl.style.gridTemplateRows    = `repeat(${size}, ${pieceH}px)`;
    puzzleEl.style.width  = gridW + "px";
    puzzleEl.style.height = gridH + "px";
    puzzleEl.innerHTML = "";
    pieces = [];
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

/* ── Mover pieza ── */
function movePiece(index) {
  const ns = getNeighbors(emptyIndex);
  if (ns.includes(index)) {
    swap(index, emptyIndex);
    emptyIndex = index;
    checkWin();
  }
}

function getNeighbors(index) {
  const ns = [];
  const x  = index % size;
  const y  = Math.floor(index / size);
  if (x > 0)         ns.push(index - 1);
  if (x < size - 1)  ns.push(index + 1);
  if (y > 0)         ns.push(index - size);
  if (y < size - 1)  ns.push(index + size);
  return ns;
}

/* ── Intercambiar piezas ── */
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

/* ── Verificar victoria ── */
function checkWin() {
  for (let i = 0; i < size * size; i++) {
    const p = pieces[i];
    if (i === size * size - 1) {
      if (!p.classList.contains("empty")) return;
      continue;
    }
    if (p.classList.contains("empty")) return;
    const x = i % size;
    const y = Math.floor(i / size);
    const expected = `-${x * pieceW}px -${y * pieceH}px`;
    const actual   = p.style.backgroundPosition.replace(/\s+/g, " ").trim();
    if (actual !== expected) return;
  }
  winMsg.classList.add("show");
  winMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ── Responsive al resize ── */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (imageURL) createPuzzle(); }, 200);
});

/* ── Iniciar ── */
cargarFotosCarpeta();