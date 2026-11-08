export function initWorkshops(isReduced) {
  const choices = [...document.querySelectorAll("[data-choice]")];
  const challenge = document.querySelector(".first-look");
  const replies = {
    a: [
      "Parlaklık dikkat çekiyor.",
      "Üstteki parlak alan, ışık yansımasının da açık görünebildiğini düşündürüyor. Kaynak görsel B bölgesini işaretliyor. Fotoğraftaki parlaklığı tek başına bir bulgu saymak yanıltabilir.",
    ],
    b: [
      "Kaynak görsel de bu alanı işaretliyor.",
      "B bölgesi kaynakta “White Spot” etiketiyle yer alıyor. Bu eşleşme tanı anlamına gelmez. Modelin işareti, fotoğrafın bağlamı ve klinik değerlendirme birlikte ele alınır.",
    ],
    unsure: [
      "Bu belirsizliği korumak önemli.",
      "Tek fotoğraftan bir alanın neden açık göründüğünü belirlemek güç olabilir. Kaynak B bölgesini işaretlese de açıklamanın bu sınırı koruması gerekir.",
    ],
  };
  choices.forEach((button) =>
    button.addEventListener("click", () => {
      choices.forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
      const [title, description] = replies[button.dataset.choice];
      document.querySelector("#challenge-status").textContent =
        "Kaynak işareti açıldı";
      document.querySelector("#challenge-result").textContent = title;
      document.querySelector("#challenge-explanation").textContent =
        description;
      document.querySelector("#challenge-reset").hidden = false;
      challenge.classList.add("answered");
    }),
  );
  document.querySelector("#challenge-reset").addEventListener("click", () => {
    challenge.classList.remove("answered");
    choices.forEach((button) => button.setAttribute("aria-pressed", "false"));
    document.querySelector("#challenge-status").textContent =
      "Önce senin gözlemin";
    document.querySelector("#challenge-result").textContent =
      "Bakmak kolay. Ayırt etmek?";
    document.querySelector("#challenge-explanation").textContent =
      "Bir alanı seç. Ardından kaynak görseldeki işareti açıp bu farkın neden önemli olduğunu inceleyelim.";
    document.querySelector("#challenge-reset").hidden = true;
  });

  let recordedOutputs = null;
  let recordFailed = false;
  const ruleIds = ["rule-focus", "rule-uncertainty", "rule-language"];
  function updatePrompt() {
    const [focus, uncertain, plain] = ruleIds.map(
      (id) => document.getElementById(id).checked,
    );
    const instructions = ["İşaretlenen açık alan hakkında bir açıklama yaz."];
    if (focus)
      instructions.push(
        "Yalnızca işaretlenen bölgeye ve verilen görüntüye odaklan.",
      );
    if (uncertain)
      instructions.push(
        "Fotoğraftan nedenini belirleyemediğin noktayı açıkça belirt. Tanı veya tedavi önerme.",
      );
    if (plain) instructions.push("Gündelik Türkçe ve kısa cümleler kullan.");
    document.querySelector("#assembled-prompt").textContent =
      instructions.join("\n");
    const variant = (focus ? 1 : 0) + (uncertain ? 2 : 0) + (plain ? 4 : 0);
    const output = recordedOutputs
      ? recordedOutputs.find((item) => item.id === variant).output
      : recordFailed
        ? "Deneme kaydı yüklenemedi. Kaynak JSON dosyasını aşağıdaki bağlantıdan açabilirsin."
        : "Kaydedilmiş Gemini çıktısı yükleniyor…";
    const area = document.querySelector("#sandbox-output");
    area.textContent = output;
    document.querySelector("#comparison-output").textContent = output;
    const notes = document.querySelector("#output-notes");
    notes.replaceChildren();
    if (recordedOutputs) {
      const p = document.createElement("p");
      p.textContent =
        "Varyant " + variant + " / 7 · Gemini web, Pro modu · 8 Kasım 2026";
      notes.append(p);
      const context = document.createElement("p");
      context.textContent =
        "Aynı istekte üretilen sekiz metin varyantından seçilen kayıt, değiştirilmeden gösteriliyor.";
      notes.append(context);
      document.querySelector("#comparison-baseline").textContent =
        recordedOutputs.find((item) => item.id === 0).output;
    }
    if (!isReduced())
      area.animate(
        [
          { opacity: 0.4, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 240 },
      );
    document.querySelector("#copy-status").textContent = "";
  }
  ruleIds.forEach((id) =>
    document.getElementById(id).addEventListener("change", updatePrompt),
  );
  updatePrompt();
  fetch("./assets/gemini-prompt-record.json")
    .then((response) => {
      if (!response.ok) throw new Error("Record not available");
      return response.json();
    })
    .then((record) => {
      if (
        record.outputs.length !== 8 ||
        !Array.from({ length: 8 }, (_, i) => i).every((id) =>
          record.outputs.some(
            (item) => item.id === id && typeof item.output === "string",
          ),
        )
      )
        throw new Error("Invalid record");
      recordedOutputs = record.outputs;
      updatePrompt();
    })
    .catch(() => {
      recordFailed = true;
      updatePrompt();
    });
  document
    .querySelector("#copy-instruction")
    .addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          document.querySelector("#assembled-prompt").textContent,
        );
        document.querySelector("#copy-status").textContent =
          "Yönerge kopyalandı.";
      } catch {
        document.querySelector(".assembled-prompt").open = true;
        document.querySelector("#copy-status").textContent =
          "Yönergeyi açılan metinden seçip kopyalayabilirsin.";
      }
    });

  const scenarios = {
    blur: {
      image: "Bulanık çekim senaryosu",
      state: "Yeniden çekim",
      title: "Sınırlar seçilemiyor.",
      text: "Bu senaryoda diş yüzeyindeki ayrıntılar bulanık. Akış, analiz yerine kamerayı sabitleyip yeniden fotoğraf çekmeyi öneriyor.",
      instruction:
        "Telefonu sabitle, odağı kontrol et ve aynı bölgeyi tekrar çek.",
    },
    glare: {
      image: "Aşırı parlama senaryosu",
      state: "Yeniden çekim",
      title: "Işık, yüzeyi örtüyor.",
      text: "Bu senaryoda parlama, incelenecek bölgenin bir kısmını gizliyor. Önce ışık ve çekim açısı düzeltiliyor.",
      instruction:
        "Işığı ve çekim açısını değiştir. Yüzeyi örten parlamayı azalt.",
    },
    clear: {
      image: "Daha net çekim senaryosu",
      state: "Örnek akış devam ediyor",
      title: "Bölgeyi inceleyebiliriz.",
      text: "Bu canlandırmada daha net görüntüyle bölge incelemesine geçiliyor. Üründe bu kararın ölçüm ve doğrulamayla desteklenmesi gerekir.",
      instruction: "Sonraki adım, görüntü hazırlama ve bölge tespiti.",
    },
  };
  let condition = "blur";
  const qualitySample = document.querySelector(".quality-sample");
  const qualityButtons = [
    ...document.querySelectorAll(".quality-options [data-condition]"),
  ];
  function selectCondition(next) {
    condition = next;
    qualitySample.dataset.condition = next;
    document.querySelector("#quality-image-label").textContent =
      scenarios[next].image;
    qualityButtons.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.condition === next),
      ),
    );
    const result = document.querySelector("#quality-result");
    result.classList.remove("checked");
    result.querySelector(".quality-state").textContent = "Çekim koşulu seçildi";
    result.querySelector("h3").textContent = "Bu kareyle devam eder miydin?";
    result.querySelector("p").textContent =
      "Kontrol düğmesiyle bu senaryonun sonraki adımını gör.";
    document.querySelector("#quality-retry").hidden = true;
  }
  qualityButtons.forEach((button) =>
    button.addEventListener("click", () =>
      selectCondition(button.dataset.condition),
    ),
  );
  document.querySelector("#quality-run").addEventListener("click", () => {
    const scenario = scenarios[condition],
      result = document.querySelector("#quality-result");
    result.classList.add("checked");
    result.querySelector(".quality-state").textContent = scenario.state;
    result.querySelector("h3").textContent = scenario.title;
    result.querySelector("p").textContent =
      scenario.text + " " + scenario.instruction;
    document.querySelector("#quality-retry").hidden = condition === "clear";
  });
  document.querySelector("#quality-retry").addEventListener("click", () => {
    selectCondition("clear");
    document.querySelector("#quality-run").focus({ preventScroll: true });
  });
}
