export function initProductionNotes() {
  const buttons = [...document.querySelectorAll("[data-trial]")];
  const notes = [
    [
      "İlk yanıt yeterince odaklı mı?",
      "Model gözlemi ve kaynak skorunu kullandı. Ancak metne kişisel bir sohbet hitabı da ekledi; açıklama arayüzde gösterilecek bir metin için uzundu. Sonraki istemde yapıyı iki cümleyle sınırlandırdım ve belirsizliği açıkça istedim.",
    ],
    [
      "Yapı düzeldi, hitap kaldı.",
      "Yanıt iki cümleye indi ve nedenin bu veriden anlaşılamadığını söyledi. Kişisel hitap hâlâ metindeydi. Son isteme doğrudan arayüz çıktısı olduğunu ve hiçbir hitap eklenmemesi gerektiğini yazdım.",
    ],
    [
      "Arayüze daha uygun bir metin.",
      "Bu yanıtta iki cümlelik yapı korundu ve kişisel hitap kaldırıldı. Gözlem ile belirsizlik birlikte yer aldı. Bu sınırlı metin denemesi klinik doğruluğu veya genel model güvenilirliğini ölçmez.",
    ],
  ];
  let records = null;
  let active = 0;
  function show(index) {
    active = index;
    buttons.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === index)),
    );
    const [title, observation] = notes[index];
    document.querySelector("#trial-title").textContent = title;
    document.querySelector("#trial-observation").textContent = observation;
    if (!records) return;
    const record = records.trials[index];
    document.querySelector("#trial-output").textContent = record.output;
    document.querySelector("#trial-prompt").textContent = record.prompt;
    const facts = document.querySelector("#trial-facts");
    facts.replaceChildren();
    const words = record.output.trim().split(" ").filter(Boolean).length;
    const sentenceCount = record.output
      .split(/[.!?]+/)
      .filter((part) => part.trim()).length;
    const elements = [
      words + " kelime",
      sentenceCount + " cümle",
      "Ayrı yeni sohbette tek yanıt",
    ];
    elements.forEach((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      facts.append(span);
    });
  }
  buttons.forEach((button, index) =>
    button.addEventListener("click", () => show(index)),
  );
  fetch("./assets/gemini-independent-records.json")
    .then((response) => {
      if (!response.ok) throw new Error("Kayıt açılamadı");
      return response.json();
    })
    .then((data) => {
      if (data.trials.length !== 3) throw new Error("Eksik kayıt");
      records = data;
      show(active);
    })
    .catch(() => {
      document.querySelector("#trial-output").textContent =
        "Kayıt yüklenemedi. Ham yanıtları alttaki bağlantıdan indirebilirsin.";
    });
  show(0);

  // Let the visitor control playback, with one audible source at a time.
  const videos = [...document.querySelectorAll("video")];
  videos.forEach((video) => {
    video.addEventListener("play", () =>
      videos.forEach((other) => {
        if (other !== video) other.pause();
      }),
    );
    new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) video.pause();
      },
      { threshold: 0.05 },
    ).observe(video);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) videos.forEach((video) => video.pause());
  });
}

const creativeTakes = [
  {
    file: "assets/gemini-surface-study-original.mp4",
    review:
      "İlk çıktı sakin kamera hareketini ve ışık geçişini üretti. Kontur ise yer yer çift çizgiye dönüştü ve beyaz alanın sınırını tam izleyemedi. Sonraki istemde bu sorunu özellikle ele aldım.",
  },
  {
    file: "assets/gemini-surface-study-take2.mp4",
    review:
      "İkinci istemde kamera hareketini azalttım ve tek, yüzeye bağlı konturu daha açık tarif ettim. Çıktı ilkine çok benzer kaldı; konturun alanı tam izlediğini söyleyemem. Bu sınırlılığı üretim kaydında korudum.",
  },
];
const takeButtons = [...document.querySelectorAll("[data-take]")];
takeButtons.forEach((button, index) =>
  button.addEventListener("click", () => {
    const video = document.querySelector("#creative-film");
    video.pause();
    video.src = creativeTakes[index].file;
    video.load();
    document.querySelector("#creative-download").href =
      creativeTakes[index].file;
    document.querySelector("#creative-review").textContent =
      creativeTakes[index].review;
    takeButtons.forEach((item, i) =>
      item.setAttribute("aria-pressed", String(i === index)),
    );
  }),
);
