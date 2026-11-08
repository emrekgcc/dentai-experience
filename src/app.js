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
let storyTravel = 1;
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
  const top = storyTop + (storyTravel * index) / 5;
  window.scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
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
  changeChapter(Math.round(progress));
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
  target = clamp(((scrollY - storyTop) / storyTravel) * 5, 0, 5);
  sectionVisible =
    scrollY + innerHeight > storyTop &&
    scrollY < storyTop + journey.offsetHeight;
  schedule();
}
function measure() {
  storyTop = journey.getBoundingClientRect().top + scrollY;
  storyTravel = Math.max(
    1,
    journey.offsetHeight -
      document.querySelector(".journey-stage").offsetHeight,
  );
  readScroll();
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

const promptParts = [
  [
    "Bir ağız içi görüntüsünde işaretlenen alanı, kişinin anlayabileceği kısa bir ön değerlendirmeyle açıkla.",
    "Önce görevi tanımlıyorum.",
    "Modelden işaretlenen bölgeye odaklanmasını istiyorum. Böylece açıklamanın hangi soruya yanıt vermesi gerektiği belirginleşiyor.",
  ],
  [
    "Yalnızca verilen fotoğrafa ve segmentasyon çıktısındaki bölge bilgisine dayan. Görüntüde doğrulanamayan bulgular ekleme.",
    "Açıklamanın dayanağını belirliyorum.",
    "Görüntü ile model çıktısını birlikte kullanıyorum. Böylece metindeki gözlemin hangi alana karşılık geldiği takip edilebiliyor.",
  ],
  [
    "Kesin tanı koyma veya tedavi önerme. Bir bulgunun nedenini fotoğraftan belirleyemiyorsan bu belirsizliği açıkça ifade et.",
    "Belirsizliğe yer bırakıyorum.",
    "Bir fotoğrafın söyleyebilecekleri sınırlı. Kullanıcının karşısına çıkan metnin de bu sınırı koruması için yönergeyi açık yazıyorum.",
  ],
  [
    "Kısa cümleler ve gündelik Türkçe kullan. Yanıtı gözlem, açıklama ve sonraki adım başlıklarıyla düzenle.",
    "Son olarak, okunabilir kılıyorum.",
    "Teknik terimleri kişinin anlayacağı bir dile indiriyorum. Aynı yapıdaki kısa raporlar, kullanıcıya ne gördüğümüzü ve neyi henüz bilmediğimizi anlatmayı kolaylaştırıyor.",
  ],
];
const promptButtons = [...document.querySelectorAll("[data-prompt]")];
promptButtons.forEach((button, index) =>
  button.addEventListener("click", () => {
    promptButtons.forEach((item, i) =>
      item.setAttribute("aria-pressed", String(i === index)),
    );
    const [code, title, reason] = promptParts[index];
    document.querySelector("#prompt-code").textContent = code;
    document.querySelector("#prompt-title").textContent = title;
    document.querySelector("#prompt-reason").textContent = reason;
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
