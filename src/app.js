import { createEnamelRenderer } from "./enamel.js";

const scenes = [
  {
    label: "01 / Yönlendirmeli çekim",
    title: "Her şey<br> bir kareyle<br> <em>başlıyor.</em>",
    description:
      "Telefonun kamerasını hazırladığını düşün. Yönlendirmeli çekim, ağız içindeki aynı bölgeyi doğru açı ve yeterli ışıkla görüntülemene yardımcı olur.",
    note: "Bu deneyimde sentetik bir örnek kullanılıyor.",
    visual: "KAMERA GÖRÜNÜMÜ",
    action: "Çekimi tamamla",
    type: "capture",
  },
  {
    label: "02 / Görüntü hazırlama",
    title: "Küçük farklara<br> biraz daha<br> <em>yakından.</em>",
    description:
      "Fotoğraf, OpenCV ve NumPy ile işlenir. CLAHE, görüntünün farklı bölgelerindeki kontrastı düzenler. Amaç, modelin inceleyeceği ayrıntıları daha belirgin hâle getirmek.",
    note: "Kontrastın etkisini açıp kapatabilirsin.",
    visual: "MİNE YÜZEYİ / ÖN İŞLEME",
    action: "Kontrast açık",
    type: "contrast",
  },
  {
    label: "03 / YOLOv8-Nano",
    title: "Bölgenin<br> sınırlarını<br> <em>izle.</em>",
    description:
      "Örnek segmentasyonu, incelenen bölgenin biçimini piksel düzeyinde çıkarır. Yüzeydeki yeşil alanı izle. Maske, kameranın hareketiyle aynı yüzey üzerinde kalır.",
    note: "Buradaki maske, çalışma prensibini gösteren bir canlandırmadır.",
    visual: "ÖRNEK SEGMENTASYON / MASKE",
    action: "Maskeyi gizle",
    type: "mask",
  },
  {
    label: "04 / Çok modlu açıklama",
    title: "Görüntü ve<br> bağlam,<br> <em>birlikte.</em>",
    description:
      "Gemini 2.0 Flash hem görüntüyü hem de işaretlenen bölge bilgisini ele alır. İstem, yalnızca eldeki gözlemi açıklamasını ve belirsiz kaldığı noktayı söylemesini ister.",
    note: "Cihazdaki tespit ve bulut açıklaması ayrı veri akışlarıdır.",
    visual: "GÖRÜNTÜ + BÖLGE BİLGİSİ",
    action: "İstemi incele ↗",
    type: "prompt",
  },
  {
    label: "05 / Kullanıcıya açıklama",
    title: "Teknik çıktı,<br> anlaşılır<br> <em>bir rapor.</em>",
    description:
      "Ön rapor; görülen alanı, bu gözlemin sınırını ve sonraki adımı birlikte sunar. Kullanıcı, işaretin ne anlama gelebileceğini sade bir dille okuyabilir.",
    note: "Örnek metin sağdaki raporda yer alıyor.",
    visual: "ÖRNEK ÖN DEĞERLENDİRME",
    action: "Raporu metin olarak oku",
    type: "report",
  },
  {
    label: "06 / Planlanan klinik akış",
    title: "Sonraki adım,<br> doğru kişiye<br> <em>ulaşmak.</em>",
    description:
      "Ürün planında, kişinin onayıyla ön raporun bir diş hekimiyle paylaşılması ve uygun kliniğe yönlendirme yer alıyor. Hekim, bulguyu klinik değerlendirmeyle ele alır.",
    note: "Klinik yönlendirme ve panel, planlanan ürün kapsamındadır.",
    visual: "İZİNLİ PAYLAŞIM / KLİNİK AKIŞ",
    action: "Perde arkasına geç ↘",
    type: "lab",
  },
];

const journey = document.querySelector(".journey");
document
  .querySelector(".stage-top")
  .after(document.querySelector(".stage-bottom"));
const stage = document.querySelector(".visual-stage");
const canvas = document.querySelector("#enamel");
const chapterButtons = [...document.querySelectorAll("[data-chapter]")];
const motionButton = document.querySelector(".motion-control");
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let manualReduced = false;
try {
  manualReduced = localStorage.getItem("dentai-reduced-motion") === "true";
} catch {}
let reduced = motionQuery.matches || manualReduced;
let renderer;
try {
  renderer = createEnamelRenderer(canvas);
} catch {
  renderer = null;
}
if (!renderer) document.documentElement.classList.add("no-webgl");

let currentChapter = -1;
let progress = 0;
let target = 0;
let frame = 0;
let lastTime = 0;
let slowFrames = 0;
let mask = true;
let maskAmount = 1;
let contrast = true;
let storyTop = 0;
let sectionVisible = false;
const timing = [];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Only consecutive rendered frames enter the performance sample. Idle time is excluded.
window.dentaiDiagnostics = {
  timings: timing,
  get resolution() {
    return renderer?.getResolution() || null;
  },
  get chapter() {
    return currentChapter;
  },
  get progress() {
    return progress;
  },
  get reducedMotion() {
    return reduced;
  },
};

function moveToChapter(index) {
  target = clamp(index, 0, scenes.length - 1);
  changeChapter(target);
  schedule();
}

function changeChapter(index) {
  if (index === currentChapter) return;
  currentChapter = index;
  const scene = scenes[index];
  document.querySelector("#scene-kicker").textContent = scene.label;
  document.querySelector("#scene-title").innerHTML = scene.title;
  document.querySelector("#scene-description").textContent = scene.description;
  document.querySelector("#scene-note").textContent = scene.note;
  document.querySelector("#visual-name").textContent = scene.visual;
  stage.dataset.scene = index;
  const fallback = document.querySelector(".model-fallback");
  fallback.src = index >= 2 ? "assets/mask.webp" : "assets/surface.webp";
  fallback.alt =
    index >= 2
      ? "Temsili mine yüzeyinde işaretlenen küçük bölge"
      : "Temsili mine yüzeyi";
  chapterButtons.forEach((button, i) =>
    button.setAttribute("aria-pressed", String(i === index)),
  );
  const controls = document.querySelector("#scene-controls");
  controls.replaceChildren();
  const button = document.createElement("button");
  button.textContent = scene.action;
  if (scene.type === "mask") {
    button.setAttribute("aria-pressed", String(mask));
    button.textContent = mask ? "Maskeyi gizle" : "Maskeyi göster";
  }
  if (scene.type === "contrast") {
    button.setAttribute("aria-pressed", String(contrast));
    button.textContent = contrast ? "Kontrast açık" : "Kontrast kapalı";
  }
  button.addEventListener("click", () => {
    switch (scene.type) {
      case "capture":
        moveToChapter(1);
        break;
      case "contrast":
        contrast = !contrast;
        button.setAttribute("aria-pressed", String(contrast));
        button.textContent = contrast ? "Kontrast açık" : "Kontrast kapalı";
        renderOnce();
        break;
      case "mask":
        mask = !mask;
        button.setAttribute("aria-pressed", String(mask));
        button.textContent = mask ? "Maskeyi gizle" : "Maskeyi göster";
        schedule();
        break;
      case "prompt":
        document
          .querySelector("#prompt")
          .scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
        break;
      case "lab":
        document
          .querySelector("#lab")
          .scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
        break;
      case "report":
        openReport();
        break;
    }
  });
  controls.append(button);
  if (!reduced) {
    document.querySelector(".story-copy").animate(
      [
        { opacity: 0.25, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
}

const report = document.createElement("dialog");
report.className = "report-dialog";
report.setAttribute("aria-label", "Örnek DentAI ön raporu");
report.innerHTML =
  '<button class="dialog-close" autofocus aria-label="Raporu kapat">Kapat ×</button><span class="eyebrow">Örnek ön değerlendirme</span><h2>Gözlemi<br> anlamak.</h2><h3>Görüntüdeki gözlem</h3><p>İşaretlenen alan çevresindeki mineye göre daha açık görünüyor.</p><h3>Açıklama</h3><p>Bu farkın nedenini yalnızca fotoğraftan belirleyemem.</p><h3>Sonraki adım</h3><p>Gerektiğinde diş hekimiyle değerlendirme.</p><small>Bu rapor, canlandırma için yazılmış temsili bir örnektir.</small>';
document.body.append(report);
report.querySelector("button").addEventListener("click", () => report.close());
report.addEventListener("click", (event) => {
  if (event.target === report) {
    const rect = report.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      report.close();
  }
});
function openReport() {
  report.showModal();
}

function renderOnce() {
  renderer?.draw(progress, { maskAmount, contrast });
}
function animate(now) {
  frame = 0;
  const consecutive = lastTime !== 0;
  const delta = consecutive ? now - lastTime : 16.7;
  lastTime = now;
  if (consecutive && delta > 0 && sectionVisible) {
    timing.push(delta);
    if (timing.length > 600) timing.shift();
    slowFrames = delta > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 12) {
      renderer?.lowerQuality();
      slowFrames = 0;
    }
  }
  const maskTarget = mask ? 1 : 0;
  maskAmount = reduced
    ? maskTarget
    : maskAmount +
      (maskTarget - maskAmount) * (1 - Math.exp(-Math.min(delta, 50) / 90));
  if (Math.abs(maskTarget - maskAmount) < 0.001) maskAmount = maskTarget;
  const distance = target - progress;
  progress = reduced
    ? target
    : progress + distance * (1 - Math.exp(-Math.min(delta, 50) / 85));
  if (Math.abs(target - progress) < 0.001) progress = target;
  changeChapter(Math.round(target));
  document.querySelector(".progress-track span").style.transform =
    "scaleX(" + progress / 5 + ")";
  if (sectionVisible) renderOnce();
  if (
    !reduced &&
    (Math.abs(target - progress) > 0.001 ||
      Math.abs(maskTarget - maskAmount) > 0.001)
  )
    frame = requestAnimationFrame(animate);
  else lastTime = 0;
}
function schedule() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(animate);
}
function readScroll() {
  const visible =
    scrollY + innerHeight > storyTop &&
    scrollY < storyTop + journey.offsetHeight;
  if (visible !== sectionVisible) {
    sectionVisible = visible;
    journey.classList.toggle("in-view", visible);
    if (visible) schedule();
  }
}
function measure() {
  storyTop = journey.getBoundingClientRect().top + scrollY;
  readScroll();
  schedule();
}
function updateMotion() {
  reduced = motionQuery.matches || manualReduced;
  document.documentElement.classList.toggle("reduce-motion", reduced);
  motionButton.setAttribute("aria-pressed", String(reduced));
  motionButton.firstChild.textContent = reduced
    ? "Hareket azaltıldı "
    : "Hareketi azalt ";
  schedule();
}
motionButton.addEventListener("click", () => {
  manualReduced = !manualReduced;
  try {
    localStorage.setItem("dentai-reduced-motion", String(manualReduced));
  } catch {}
  updateMotion();
});
motionQuery.addEventListener("change", updateMotion);
chapterButtons.forEach((button) =>
  button.addEventListener("click", () =>
    moveToChapter(Number(button.dataset.chapter)),
  ),
);
addEventListener("scroll", readScroll, { passive: true });
addEventListener("resize", measure, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  } else measure();
});
canvas.addEventListener("webglcontextlost", () => {
  renderer = null;
  document.documentElement.classList.add("no-webgl");
});
document.fonts.ready.then(measure);
updateMotion();
measure();
changeChapter(0);

// The comparison is a visual teaching aid; it does not run image inference.
const compare = document.querySelector("#compare");
compare.addEventListener("input", () => {
  const percent = Number(compare.value);
  document.querySelector(".contrast-layer").style.clipPath =
    "inset(0 " + (100 - percent) + "% 0 0)";
  document.querySelector(".compare-line").style.left = percent + "%";
});

const examples = [
  [
    "✧",
    "Işık da beyaz görünür.",
    "Tükürük yüzeyindeki parlama, açık renkli bir mine bölgesine benzeyebilir. Bu tür örnekleri eğitimde negatif örnek olarak kullanmak, modelin ayrımı öğrenmesine yardımcı olur.",
  ],
  [
    "⌘",
    "Metal, ışığı başka türlü yansıtır.",
    "Diş telinin kenarı ve bağlantı parçaları güçlü yansımalar oluşturabilir. Modelin bu yapıların çevresini yanlışlıkla lezyon olarak işaretlememesi için diş teli örneklerini özellikle ele aldım.",
  ],
  [
    "≋",
    "Yüzeydeki birikim de yanıltabilir.",
    "Plak ve tartarın görünümü, çekim koşullarına göre mineyle karışabilir. Bu örnekleri negatif örnekler arasında değerlendirmek, modelin yalnızca açık renkli alanlara tepki vermesini azaltmayı hedefler.",
  ],
];
const exampleButtons = [...document.querySelectorAll("[data-example]")];
exampleButtons.forEach((button, index) =>
  button.addEventListener("click", () => {
    exampleButtons.forEach((item, i) =>
      item.setAttribute("aria-pressed", String(i === index)),
    );
    const [symbol, title, text] = examples[index];
    document.querySelector(".sample-symbol").textContent = symbol;
    document.querySelector("#negative-title").textContent = title;
    document.querySelector("#negative-text").textContent = text;
  }),
);

const film = document.querySelector("#analysis-film");
const filmButtons = [...document.querySelectorAll("[data-time]")];
const filmTimes = filmButtons.map((button) => Number(button.dataset.time));
filmButtons.forEach((button) =>
  button.addEventListener("click", async () => {
    if (!film.readyState) {
      await new Promise((resolve) =>
        film.addEventListener("loadedmetadata", resolve, { once: true }),
      );
    }
    film.currentTime = Number(button.dataset.time);
    try {
      await film.play();
    } catch {
      /* Native controls remain available. */
    }
  }),
);
film.addEventListener("timeupdate", () => {
  const index = filmTimes.findLastIndex((time) => time <= film.currentTime);
  filmButtons.forEach((button, i) =>
    button.setAttribute("aria-pressed", String(i === index)),
  );
});
const filmVisibility = new IntersectionObserver(
  (entries) => {
    if (!entries[0].isIntersecting) film.pause();
  },
  { threshold: 0.05 },
);
filmVisibility.observe(film);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) film.pause();
});
motionButton.addEventListener("click", () => {
  if (reduced) film.pause();
});

const findings = [
  {
    label: "Kaynak etiketi / White Spot",
    title: "Renk farkının<br>izini sür.",
    observation:
      "İlk dişin yüzeyinde çevresine göre daha açık görünen bir alan var.",
    model:
      "Kaynak görsel bu alanı “White Spot” olarak etiketliyor ve 0,91 skorunu gösteriyor.",
    meaning:
      "Ön rapor, görülen renk farkını anlatır. Farkın nedenini belirlemek için klinik değerlendirme gerekir.",
    focus: [138, 120],
    time: 3,
  },
  {
    label: "Kaynak etiketi / Caries",
    title: "İkinci işarete<br>yakından bak.",
    observation:
      "İkinci dişin çiğneme yüzeyinde çevresinden daha koyu görünen küçük bir bölge var.",
    model:
      "Kaynak görsel bu alanı “Caries” olarak etiketliyor ve 0,96 skorunu gösteriyor.",
    meaning:
      "Açıklama, görülen alanı ve model etiketini birlikte ele alır. Etiketin klinik karşılığı hekim tarafından değerlendirilir.",
    focus: [283, 102],
    time: 6,
  },
];
const findingButtons = [...document.querySelectorAll("[data-find]")];
const regions = [...document.querySelectorAll("[data-region]")];
const evidenceCamera = document.querySelector(".evidence-camera");
const zoomButton = document.querySelector("#evidence-zoom");
const maskButton = document.querySelector("#evidence-mask");
let selectedFinding = 0;
let evidenceZoom = false;
let zoomFrame = 0;
let currentView = [0, 0, 1];

function positionEvidence() {
  cancelAnimationFrame(zoomFrame);
  const [x, y] = findings[selectedFinding].focus;
  const scale = evidenceZoom ? 1.65 : 1;
  const target = evidenceZoom
    ? [220.5 - x * scale, 134.5 - y * scale, scale]
    : [0, 0, 1];
  const from = [...currentView];
  const start = performance.now();
  function update(now) {
    const fraction = reduced ? 1 : Math.min(1, (now - start) / 650);
    const ease = 1 - Math.pow(1 - fraction, 3);
    currentView = from.map(
      (value, index) => value + (target[index] - value) * ease,
    );
    evidenceCamera.setAttribute(
      "transform",
      "translate(" +
        currentView[0] +
        " " +
        currentView[1] +
        ") scale(" +
        currentView[2] +
        ")",
    );
    if (fraction < 1) zoomFrame = requestAnimationFrame(update);
  }
  zoomFrame = requestAnimationFrame(update);
}

function selectFinding(index) {
  selectedFinding = index;
  findingButtons.forEach((button, i) =>
    button.setAttribute("aria-pressed", String(i === index)),
  );
  regions.forEach((region, i) => {
    region.setAttribute("aria-pressed", String(i === index));
    region.classList.toggle("selected", i === index);
  });
  const finding = findings[index];
  document.querySelector("#finding-label").textContent = finding.label;
  document.querySelector("#finding-title").innerHTML = finding.title;
  document.querySelector("#finding-observation").textContent =
    finding.observation;
  document.querySelector("#finding-model").textContent = finding.model;
  document.querySelector("#finding-meaning").textContent = finding.meaning;
  updateFindingVoice();
  positionEvidence();
}
findingButtons.forEach((button, index) =>
  button.addEventListener("click", () => selectFinding(index)),
);
regions.forEach((region, index) => {
  region.addEventListener("click", () => selectFinding(index));
  region.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectFinding(index);
    }
  });
});
zoomButton.addEventListener("click", () => {
  evidenceZoom = !evidenceZoom;
  zoomButton.setAttribute("aria-pressed", String(evidenceZoom));
  zoomButton.textContent = evidenceZoom ? "Tüm görüntü ↙" : "Yakından bak +";
  positionEvidence();
});
maskButton.addEventListener("click", () => {
  const enabled = maskButton.getAttribute("aria-pressed") !== "true";
  maskButton.setAttribute("aria-pressed", String(enabled));
  maskButton.textContent = enabled ? "Maske açık" : "Maske kapalı";
  document
    .querySelector(".evidence-masks")
    .classList.toggle("mask-hidden", !enabled);
});
document.querySelector("#mask-strength").addEventListener("input", (event) => {
  document
    .querySelector(".evidence-masks")
    .style.setProperty("--mask-strength", Number(event.target.value) / 100);
});
document
  .querySelector(".evidence-film-link")
  .addEventListener("click", async () => {
    film.scrollIntoView({ behavior: "instant", block: "center" });
    if (!film.readyState)
      await new Promise((resolve) =>
        film.addEventListener("loadedmetadata", resolve, { once: true }),
      );
    film.currentTime = findings[selectedFinding].time;
    try {
      await film.play();
    } catch {
      /* The native play control remains available. */
    }
  });

let findingVoice = "patient";
const voiceButtons = [...document.querySelectorAll("[data-voice]")];
function updateFindingVoice() {
  const technical = findingVoice === "technical";
  const finding = findings[selectedFinding];
  document.querySelector("#finding-observation").textContent = technical
    ? [
        "Seçili ROI içinde çevre mineye göre açık renkli bir alan izleniyor.",
        "Seçili ROI, oklüzal yüzeydeki koyu bölgeye karşılık geliyor.",
      ][selectedFinding]
    : finding.observation;
  document.querySelector("#finding-model").textContent = technical
    ? [
        "Instance etiketi: White Spot. Kaynakta verilen skor: 0,91. Sınır, bu anlatımda yeniden çizilmiş bir piksel maskesiyle gösteriliyor.",
        "Instance etiketi: Caries. Kaynakta verilen skor: 0,96. Sınır, bu anlatımda yeniden çizilmiş bir piksel maskesiyle gösteriliyor.",
      ][selectedFinding]
    : finding.model;
  document.querySelector("#finding-meaning").textContent = technical
    ? "Görüntü + instance etiketi + maske bilgisi açıklama katmanına aktarılır. Skor klinik doğruluk yüzdesi olarak yorumlanmaz; klinik değerlendirme ayrıca gerekir."
    : finding.meaning;
  const layout = document.querySelector(".evidence-layout");
  layout.classList.remove("connecting");
  if (!reduced) requestAnimationFrame(() => layout.classList.add("connecting"));
}
voiceButtons.forEach((button) =>
  button.addEventListener("click", () => {
    findingVoice = button.dataset.voice;
    voiceButtons.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    updateFindingVoice();
  }),
);
document.querySelector(".report-download").addEventListener("click", () => {
  const finding = findings[selectedFinding];
  const text = [
    "DentAI / Örnek gözlem notu",
    finding.label,
    "",
    ...["#finding-observation", "#finding-model", "#finding-meaning"].map(
      (selector) => document.querySelector(selector).textContent,
    ),
    "",
    "Kaynak görsele dayalı temsilî anlatım. Yeni model çıkarımı yapılmadı. Hekim değerlendirmesi gerekir.",
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "DentAI-ornek-gozlem-" + (selectedFinding + 1) + ".txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

import { initWorkshops } from "./workshops.js";
initWorkshops(() => reduced);

import { initProductionNotes } from "./production-notes.js";
initProductionNotes();
