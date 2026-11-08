# DentAI — Bir görüntünün yolculuğu

Gemini Prompt Arena için hazırlanan etkileşimli DentAI proje anlatımı.

Sayfa, çekimden ön rapora kadar altı adımı kaydırma ile anlatır. Diş yüzeyi ve ona bağlı maske WebGL ile çizilir. Örnekler, karşılaştırma sürgüsü ve istem bölümleri ziyaretçinin kontrolündedir. Görseller, maske ve rapor temsilidir. Canlı model çıkarımı veya hasta verisi işleme yapılmaz.

## Yerel çalışma

Python 3 ile depo klasöründe:

```sh
python -m http.server 8804 --bind 127.0.0.1
```

Tarayıcıda http://127.0.0.1:8804 açılır. Kurulum veya derleme gerekmez.

## İçerik ve dosyalar

- `index.html` — sayfa yapısı, proje anlatımı ve erişilebilir içerik
- `src/app.js` — altı adım, kaydırma, karşılaştırma ve istem etkileşimleri
- `src/enamel.js` — yüzeye bağlı maske ile sentetik WebGL diş modeli
- `src/style.css` — masaüstü, mobil ve azaltılmış hareket düzenleri
- `assets/` — yerel yazı tipleri, görseller ve proje sunumu

Yazı tipleri Barlow Condensed ve DM Sans, Google Fonts üzerinden edinilmiştir. Lisansları assets klasöründedir.

Animasyon döngüsü yalnızca hareket sırasında çizim yapar. Ekran dışındaki model durur, sekme gizlenince döngü durdurulur. Piksel oranı sınırlanır, yavaş karelerde çizim çözünürlüğü azaltılır. Sistem hareket tercihi ve sayfadaki hareket düğmesi desteklenir. WebGL kullanılamıyorsa sabit görsel gösterilir.

GitHub Pages bu geliştirme turunda etkinleştirilmemiştir. Yayın kararı son incelemeden sonra verilecektir.

Proje sahibi Emre Küçükgöçer. Bu web deneyiminin kod ve görsel anlatımında ChatGPT desteği kullanılmıştır.

## Doğrulama

8 Kasım 2026 tarihinde yerel Chrome testlerinde 1440×960, 768×1024, 390×844, 360×740, 320×568 ve 844×390 ekran boyutları kontrol edildi. Altı akış adımı, maske ve kontrast düğmeleri, rapor penceresi, karşılaştırma sürgüsü, istem sekmeleri, açılır proje notları ve PDF bağlantısı test edildi. Azaltılmış hareket ve WebGL bulunmayan tarayıcı için alternatif görünüm kontrol edildi.

1440×960 ekranda, Chrome headless ve SwiftShader yazılımsal çizimiyle yapılan 10 saniyelik kaydırma ölçümünde ortalama 41 FPS görüldü. 407 ardışık kare örneğinde yüzde 95 kare süresi 27,8 ms idi. Çizim tamponu 769×700 pikseldi. Bu ölçüm fiziksel telefon testi veya tüm cihazlarda FPS garantisi değildir. Gerçek hız cihaz, tarayıcı, ekran yenileme hızı ve arka plan yüküne bağlıdır.
