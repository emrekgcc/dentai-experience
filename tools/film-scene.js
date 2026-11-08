const ink = "#f0f0e7";
const muted = "#95aaa7";
const yellow = "#e8df76";
const coral = "#f17c62";
const smooth = (start, end, value) => {
  const x = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return x * x * (3 - 2 * x);
};
const whiteSpot = [
  [93, 132],
  [94, 158],
  [106, 166],
  [143, 158],
  [161, 140],
  [177, 122],
  [184, 99],
  [178, 85],
  [168, 79],
  [156, 72],
  [145, 64],
  [130, 69],
  [117, 79],
  [113, 97],
  [109, 115],
];
const caries = [
  [267, 95],
  [273, 86],
  [283, 82],
  [294, 86],
  [301, 94],
  [300, 105],
  [292, 115],
  [279, 120],
  [269, 116],
  [265, 106],
];

function contour(ctx, points) {
  const last = points.at(-1);
  const first = points[0];
  ctx.beginPath();
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    ctx.quadraticCurveTo(
      point[0],
      point[1],
      (point[0] + next[0]) / 2,
      (point[1] + next[1]) / 2,
    );
  });
  ctx.closePath();
}
function label(ctx, text, x, y, size = 18, color = ink, weight = 400) {
  ctx.fillStyle = color;
  ctx.font = weight + " " + size + "px 'DM Sans', sans-serif";
  ctx.fillText(text, x, y);
}
function lines(ctx, items, x, y, size = 25, color = ink) {
  items.forEach((text, index) =>
    label(ctx, text, x, y + index * size * 1.48, size, color),
  );
}
function mask(ctx, points, color, amount) {
  if (amount <= 0) return;
  ctx.save();
  contour(ctx, points);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45 * amount;
  ctx.fill();
  ctx.globalAlpha = amount;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  const perimeter = points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);
  ctx.setLineDash([amount * perimeter, perimeter]);
  ctx.stroke();
  ctx.restore();
}

export function drawFilm(ctx, t, image) {
  ctx.clearRect(0, 0, 1920, 1080);
  ctx.fillStyle = "#0b171c";
  ctx.fillRect(0, 0, 1920, 1080);
  label(ctx, "DentAI", 72, 76, 28, ink, 700);
  label(ctx, "GÖRÜNTÜDEN AÇIKLAMAYA", 250, 74, 13, muted, 500);
  label(ctx, "ÖRNEK GÖRSEL / ANİMASYONLA YENİDEN ANLATIM", 1250, 74, 13, muted);
  ctx.strokeStyle = "#526a633f";
  ctx.beginPath();
  ctx.moveTo(72, 105);
  ctx.lineTo(1848, 105);
  ctx.stroke();

  const segment = smooth(2.5, 6.5, t);
  const second = smooth(6, 9, t);
  const zoom = smooth(9, 12, t) * (1 - smooth(17, 20, t));
  const x = 72,
    y = 205,
    w = 1180,
    h = 720;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();
  ctx.fillStyle = "#233334";
  ctx.fillRect(x, y, w, h);
  ctx.translate(x + w / 2, y + h / 2);
  const scale = (w / 441) * (1 + zoom * 0.2);
  ctx.scale(scale, scale);
  ctx.translate(-220.5 - zoom * 45, -134.5);
  ctx.drawImage(image, 20, 105, 441, 269, 0, 0, 441, 269);

  // Masks use the same image-space transform as the underlying photograph.
  mask(ctx, whiteSpot, yellow, segment);
  mask(ctx, caries, coral, second);
  const scan = smooth(0.8, 3.8, t);
  if (t > 0.8 && t < 3.8) {
    ctx.strokeStyle = "#e8f9e3b0";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(scan * 441, 0);
    ctx.lineTo(scan * 441, 269);
    ctx.stroke();
  }
  ctx.restore();

  const phase = t < 3 ? 0 : t < 9 ? 1 : t < 17 ? 2 : 3;
  const titles = [
    "GÖRÜNTÜYÜ HAZIRLA",
    "BÖLGELERİ AYIR",
    "BULGUYU OKU",
    "BAĞLAMIYLA AÇIKLA",
  ];
  label(ctx, titles[phase], 72, 160, 16, "#bcd0c5", 500);
  label(ctx, "01 / Gönderilen örnek görüntü", 90, 966, 16, muted);
  label(
    ctx,
    "Maske, görüntünün koordinatlarına bağlı kalır.",
    90,
    1000,
    16,
    muted,
  );

  const left = 1320;
  label(ctx, "0" + (phase + 1) + " / 04", left, 185, 15, muted);
  const headlines = [
    ["Bir kare.", "İki farklı bölge."],
    ["Her bölgenin", "kendi sınırı."],
    ["Gözlemi", "yorumdan ayır."],
    ["Görüntü + maske.", "Anlaşılır açıklama."],
  ];
  lines(ctx, headlines[phase], left, 260, 41, ink);
  ctx.fillStyle = "#768e7c55";
  ctx.fillRect(left, 365, 525, 1);

  const activeA = t >= 3;
  const activeB = t >= 7;
  ctx.globalAlpha = activeA ? 1 : 0.3;
  ctx.fillStyle = yellow;
  ctx.beginPath();
  ctx.arc(left + 7, 420, 6, 0, 7);
  ctx.fill();
  label(ctx, "AÇIK RENKLİ BÖLGE", left + 27, 426, 16, yellow, 600);
  lines(
    ctx,
    ["Kaynak görselde “White Spot”", "olarak işaretlenen alan."],
    left,
    468,
    20,
  );
  label(ctx, "Kaynak etiketi · skor 0,91", left, 542, 14, muted);
  ctx.globalAlpha = activeB ? 1 : 0.25;
  ctx.fillStyle = coral;
  ctx.beginPath();
  ctx.arc(left + 7, 604, 6, 0, 7);
  ctx.fill();
  label(ctx, "İKİNCİ BÖLGE", left + 27, 610, 16, coral, 600);
  lines(
    ctx,
    ["Kaynak görselde “Caries”", "olarak işaretlenen alan."],
    left,
    652,
    20,
  );
  label(ctx, "Kaynak etiketi · skor 0,96", left, 726, 14, muted);
  ctx.globalAlpha = 1;

  const end = smooth(17, 19, t);
  ctx.save();
  ctx.globalAlpha = end;
  ctx.fillStyle = "#192c2e";
  ctx.beginPath();
  ctx.roundRect(left, 785, 525, 182, 8);
  ctx.fill();
  label(ctx, "ÖRNEK AÇIKLAMA", left + 22, 820, 12, "#c4e0bc", 600);
  lines(
    ctx,
    [
      "“İşaretlenen alanların görünümü",
      "farklı. Nedenleri klinik muayene",
      "ile değerlendirilmelidir.”",
    ],
    left + 22,
    857,
    18,
    ink,
  );
  ctx.restore();

  label(
    ctx,
    "Temsili maskeler · Kaynak skorlar yeniden ölçülmedi · Klinik tanı değildir",
    72,
    1052,
    13,
    muted,
  );
  ctx.fillStyle = "#41544b";
  ctx.fillRect(1320, 1010, 525, 2);
  ctx.fillStyle = yellow;
  ctx.fillRect(1320, 1010, 525 * Math.min(1, t / 24), 2);
}
