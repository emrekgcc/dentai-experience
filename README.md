# DentAI — Bir görüntünün yolculuğu

Gemini Prompt Arena için hazırlanan etkileşimli DentAI proje anlatımı.

Sayfa, çekimden ön rapora kadar altı adımı ziyaretçinin seçtiği düğmelerle anlatır. Diş yüzeyi ve ona bağlı maske WebGL ile çizilir. Örnekler, karşılaştırma sürgüsü ve istem bölümleri ziyaretçinin kontrolündedir. Görseller, maske ve rapor temsilidir. Canlı model çıkarımı veya hasta verisi işleme yapılmaz.

## Yerel çalışma

Node.js ile depo klasöründe:

```sh
node tools/serve.cjs
```

Tarayıcıda http://127.0.0.1:8805 açılır. Kurulum veya derleme gerekmez.

## İçerik ve dosyalar

- `index.html` — sayfa yapısı, proje anlatımı ve erişilebilir içerik
- `src/app.js` — altı adım, kaydırma, karşılaştırma ve istem etkileşimleri
- `src/enamel.js` — yüzeye bağlı maske ile sentetik WebGL diş modeli
- `src/style.css` — masaüstü, mobil ve azaltılmış hareket düzenleri
- `assets/` — yerel yazı tipleri, görseller ve proje sunumu

Yazı tipleri Barlow Condensed ve DM Sans, Google Fonts üzerinden edinilmiştir. Lisansları assets klasöründedir.

Animasyon döngüsü yalnızca hareket sırasında çizim yapar. Ekran dışındaki model durur, sekme gizlenince döngü durdurulur. Piksel oranı sınırlanır, yavaş karelerde çizim çözünürlüğü azaltılır. Sistem hareket tercihi ve sayfadaki hareket düğmesi desteklenir. WebGL kullanılamıyorsa sabit görsel gösterilir.

Yayın hedefi https://emrekgcc.github.io/dentai-experience/ adresidir. Kaynaklar bu depodan GitHub Pages ile yayımlanır.

Proje sahibi Emre Küçükgöçer. Bu web deneyiminin kod ve görsel anlatımında ChatGPT desteği kullanılmıştır.

## Doğrulama

8 Kasım 2026 tarihinde yerel Chrome testlerinde 1440×960, 768×1024, 390×844, 360×740, 320×568 ve 844×390 ekran boyutları kontrol edildi. Altı akış adımı, maske ve kontrast düğmeleri, rapor penceresi, karşılaştırma sürgüsü, istem sekmeleri, açılır proje notları ve PDF bağlantısı test edildi. Azaltılmış hareket ve WebGL bulunmayan tarayıcı için alternatif görünüm kontrol edildi.

1440×960 ekranda, Chrome headless ve SwiftShader yazılımsal çizimiyle yapılan 10 saniyelik kaydırma ölçümünde ortalama 41 FPS görüldü. 407 ardışık kare örneğinde yüzde 95 kare süresi 27,8 ms idi. Çizim tamponu 769×700 pikseldi. Bu ölçüm fiziksel telefon testi veya tüm cihazlarda FPS garantisi değildir. Gerçek hız cihaz, tarayıcı, ekran yenileme hızı ve arka plan yüküne bağlıdır.

## Görüntü üzerinde analiz filmi

Gönderilen segmentasyon görseli, 24 saniyelik ve 1920×1080 çözünürlükte 60 FPS filme dönüştürüldü. Dosya 1440 kare içerir. Kaynak görselin ayrıntı seviyesi kendi çözünürlüğüyle sınırlıdır. Maskeler kaynak görsele göre temsilî olarak yeniden çizildi. Kaynaktaki skorlar yeniden ölçülmedi.

Film, görüntü hazırlama, segmentasyon, bulgular ve açıklama bölümlerinden oluşur. Sayfadaki bölüm düğmeleri video zamanına bağlıdır. Türkçe açıklama altyazısı, native oynatma ve indirme desteklenir. Ekran dışına veya arka plana geçildiğinde video durur.

- assets/DentAI-segmentation-1080p60.mp4 — doğrulanmış 1920×1080 / 60 FPS film
- assets/segmentation-reference.png — gönderilen kaynak görsel
- tools/film-scene.js — çizim ve maske koordinatları
- tools/film.html — kare üretimi için sahne
- tools/serve.cjs — video aralık isteklerini destekleyen yerel sunucu

Masaüstü 1440 ve mobil 390 piksel genişlikte video yüklemesi, bölüm atlamaları, seçili bölüm durumları, yatay taşma ve 3B akışa geçiş doğrulandı. H.264 dosya bilgisi ffprobe ile kontrol edildi. Bu kontroller yerel önizlemede gerçekleştirildi.

## Etkileşimli bulgu incelemesi

Fotoğraf üzerindeki iki bölge dokunma veya klavyeyle seçilebilir. Seçim, kaynak etiketini ve açıklamayı günceller. Yakınlaştırma, maske görünürlüğü, yoğunluk sürgüsü ve ilgili video anına geçiş desteklenir. Yeni bir çıkarım çalıştırılmaz. 1440, 390 ve 320 piksel genişlikte kontroller doğrulandı.

## Sürekli sayfa akışı ve deney atölyeleri

Tam ekranı uzun süre sabitleyen kaydırma kaldırıldı. Analiz panelindeki altı adım düğmelerle seçilir. Sayfadan ayrılıp geri gelmek seçimi değiştirmez. Sabit görüntü, sayfa kaydırılıyor diye tekrar çizilmez.

- İlk bakış deneyi üç seçeneğe farklı açıklamalar verir ve kaynak maskesini açar. Doğru tanı puanlaması yapılmaz.
- Yönerge atölyesi, üç seçeneğin sekiz birleşimini gerçek Gemini metin çıktılarıyla gösterir. Gemini web Pro modunda tek bir istekte sekiz varyant üretildi. Bu, metin tabanlı bir toplu denemedir. Görüntü yüklenmedi ve bağımsız bir performans deneyi yapılmadı. İstem ve ham çıktılar assets/gemini-prompt-record.json içinde korunur.
- Kullanıcı ve teknik anlatım aynı seçili bulguyu, kaynak skorunu ve maskeyi korur. Görünüm geçişinde kısa bir bağlantı animasyonu kullanılır.
- Bulanık, parlamalı ve daha net çekim senaryoları planlanan kalite kontrol akışını gösterir. Görüntü kalitesi ölçümü veya klinik çıkarım yapılmaz.
- Seçili gözlem metin dosyası olarak indirilebilir. Oluşturulan yönerge kopyalanabilir.

1440×960, 768×1024, 390×844 ve 320×568 ekranlarda yeni etkileşimler, indirme, adım seçiminin korunması, yatay taşma ve azaltılmış hareket kontrol edildi.

## Bağımsız metin denemeleri

Ayrı üç yeni Gemini sohbetinde aynı temsili metin girdisiyle gerçek yanıtlar kaydedildi. İlk iki yanıtta kişisel hitap kaldı. Son istemde hitap eklenmemesi açıkça istendi; kaydedilmiş son yanıtta hitap kaldırıldı. Ham yanıtlar değiştirilmeden assets/gemini-independent-records.json içinde saklanır. Bu tekil metin denemeleri klinik veya istatistiksel doğrulama değildir.

Gemini ile üretilen kısa filmler kullanıcının isteğiyle siteden kaldırıldı. Başvuru akışında video dosyası Google Flow'da hazırlanacak, çalışmanın bağlantısı alanında bu site paylaşılacaktır.
