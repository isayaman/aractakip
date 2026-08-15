# WILO Araç Takip Sistemi

Bu proje; araç kaydı, tahsis/devir, KM takibi, lastik, kaza/hasar, servis/bakım,
ruhsat, sigorta, trafik cezaları, muayene ve genel dosya takibini içeren,
**PostgreSQL veritabanında kalıcı olarak saklanan** ve **şifreli girişle**
korunan kurumsal bir araç filo yönetim sistemidir.

## Bu sürümde neler var?

- **Kalıcı veritabanı:** Tüm veriler PostgreSQL'de saklanır; sayfa
  yenilense, sunucu yeniden başlasa veya yeniden deploy edilse bile hiçbir
  kayıt kaybolmaz.
- **Şifreli giriş:** Uygulama internete açık olduğu için, tek bir şirket
  şifresiyle korunur. Şifreyi bilmeyen kimse veriye erişemez.
- **Genişletilmiş araç detay ekranı:** Kullanım/Tahsis, KM Takibi, Lastik,
  Kaza & Hasar (çoklu resim/dosya), Servis & Bakım (dosya ekli), Ruhsat,
  Sigorta, Trafik Cezaları, Muayene, Dosyalar (Zimmet Formu / Taahhütname)
  sekmeleri.
- **Aracı Devret:** Araç filoda kalırken kullanıcı değiştiğinde (iade değil,
  devir) eski kullanım bilgisi "Tahsis Geçmişi"ne kaydedilir.
- **Uyarılar paneli:** Muayene / Sigorta bitişine 15 gün kala, marka bazlı
  bakım KM aralığı veya 1 yıl dolduğunda, ve havuz bazlı toplam KM sınırına
  yaklaşıldığında otomatik uyarı verir.
- **Rapor (Excel) indirme:** Tüm araçların özet bilgilerini tek tıkla
  `.xlsx` olarak indirir.
- **Masraf Yeri, Marka Bazlı Bakım KM Aralığı, Havuz Bazlı Toplam KM Sınırı**
  gibi yeni parametreler, Parametre Yönetimi ekranından yönetilir.
- **Oturum kalıcılığı:** Giriş bilgisi artık veritabanında saklanıyor; ücretsiz
  sunucu "uykuya" geçip uyansa bile kullanıcı otomatik olarak dışarı
  atılmıyor.
- **Tüm tarihler Türkiye formatında (GG.AA.YYYY)** gösteriliyor.
- **Excel raporu profesyonel biçimlendirmeli:** WILO yeşili başlık, beyaz
  kalın yazı, tüm hücrelerde kenarlık, otomatik filtre, içeriğe göre sütun
  genişliği, Verdana 10pt yazı tipi.
- Ana ekranda **"İade Süresi Yaklaşan"** kartı eklendi.
- **Genel Dağılım paneli:** Tahsis tipine ve filoya göre araç dağılımını
  gösteren, açılır/kapanır bir özet bölüm.
- **Toplu Araç Yükle (Excel):** Parametre Yönetimi ekranından bir Excel
  şablonu indirip birden fazla aracı tek seferde içe aktarabilirsiniz.
  Yüklenen tüm yazılar otomatik BÜYÜK HARF'e çevrilir; Excel'deki yeni
  marka/filo/bölüm gibi değerler otomatik olarak ilgili parametre listesine
  eklenir.
- **Tam Yedek İndir / Geri Yükle:** Parametre Yönetimi ekranından tüm araç
  verinizi (resim ve dosyalar dahil) tek bir dosya olarak indirip
  saklayabilir, gerektiğinde geri yükleyebilirsiniz.

## Klasör yapısı

```
wilo-arac-takip/
├── public/
│   ├── index.html       ← Ana uygulama arayüzü
│   └── login.html        ← Giriş (şifre) ekranı
├── server.js              ← Express sunucusu + veritabanı + giriş kontrolü
├── seed-data.js            ← Veritabanı ilk kez boşsa yüklenecek başlangıç verisi
├── package.json
├── render.yaml              ← Render "Blueprint" dosyası (tek tıkla kurulum)
├── .env.example
└── .gitignore
```

## 1. Giriş Şifresini Ayarlama (ÖNEMLİ)

Uygulama üç ortam değişkeni kullanır:

| Değişken | Ne işe yarar | Zorunlu mu? |
|---|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi | Kalıcı kayıt için evet |
| `APP_PASSWORD` | Uygulamaya giriş şifresi | **Evet, mutlaka ayarlayın** |
| `SESSION_SECRET` | Oturum çerezlerini imzalamak için rastgele bir metin | Önerilir |

`APP_PASSWORD` tanımlanmazsa uygulama **şifresiz** ve **herkese açık**
çalışır — canlı ortamda bunu kesinlikle yapmayın.

Render'da bu değerleri **Environment** sekmesinden veya Blueprint kurulumu
sırasında (aşağıda anlatılıyor) tanımlarsınız. Şifreyi değiştirmek
isterseniz, Render'da `APP_PASSWORD` değişkenini güncelleyip servisi
yeniden başlatmanız yeterlidir; kodda hiçbir değişiklik gerekmez.

## 2. Yerel bilgisayarınızda deneme (isteğe bağlı)

```bash
npm install
npm start
```

`.env.example` dosyasını `.env` olarak kopyalayıp kendi değerlerinizi
girebilirsiniz. `DATABASE_URL` tanımlı değilse veriler yalnızca bellekte
tutulur (yalnızca hızlı arayüz testi içindir).

## 3. GitHub'a yükleme

```bash
git init
git add .
git commit -m "WILO Araç Takip Sistemi - genişletilmiş sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
git push -u origin main
```

## 4. Render'da yayınlama

1. [render.com](https://render.com) üzerinde oturum açın.
2. **New +** → **Blueprint** → GitHub reponuzu seçip bağlayın.
3. Render, `render.yaml` dosyasını okuyup şunları önerecek:
   - `wilo-arac-takip` Web Service
   - `wilo-arac-takip-db` PostgreSQL veritabanı
   - `APP_PASSWORD` için **sizden bir değer girmenizi isteyecek** (boş
     bırakmayın — burada şirket şifrenizi belirleyin)
   - `SESSION_SECRET` otomatik olarak rastgele üretilecek
4. **Apply** butonuna tıklayın ve kurulumun tamamlanmasını bekleyin.
5. Verilen adresi açtığınızda önce **giriş (şifre) ekranı** karşınıza
   çıkacak; belirlediğiniz `APP_PASSWORD` değerini girerek sisteme
   erişebilirsiniz.

### Şifreyi sonradan değiştirmek isterseniz

Render → servisiniz → **Environment** sekmesi → `APP_PASSWORD` değerini
güncelleyin → **Save Changes** (servis otomatik yeniden başlar).

## Uyarılar ve Bakım/KM Parametrelerini Ayarlama

Parametre Yönetimi ekranını açtığınızda, kategori listesinin altında iki
ek panel göreceksiniz:

- **Marka Bazlı Bakım KM Aralığı:** Her marka için (ör. Volkswagen → 15.000
  km, Ford → 30.000 km) periyodik bakım KM değerini buradan girersiniz.
- **Havuz Bazlı Toplam KM Sınırı:** "Havuz 1", "Havuz 2" gibi birden fazla
  aracın KM'sinin toplandığı gruplar için toplam sözleşme KM sınırını
  buradan girersiniz. "Tek Başına" tipindeki araçlarda bunun yerine aracın
  kendi "KM Sınırı" alanı kullanılır.

Bu değerler girildikten sonra Uyarılar paneli otomatik olarak günceli
hesaplar; ayrıca her araç detayındaki KM Takibi sekmesinde de aynı analiz
gösterilir.

## Önemli notlar

- **⚠️ ÖNEMLİ — Render'ın ücretsiz PostgreSQL veritabanı, oluşturulduktan
  30 GÜN SONRA süresi doluyor**, ardından 14 günlük bir ek süre veriliyor;
  bu süre içinde ücretli plana geçilmezse **veritabanı ve içindeki TÜM VERİ
  kalıcı olarak siliniyor** (Render'ın ücretsiz planı hiçbir yedekleme
  özelliği de sunmuyor). Bunu önlemek için:
  - Parametre Yönetimi ekranındaki **"Yedek İndir"** özelliğiyle düzenli
    (örn. haftada bir) tam yedek alıp bilgisayarınızda saklayın, **veya**
  - Render'ın ücretli veritabanı planına geçin (süre dolması ve veri kaybı
    riski tamamen ortadan kalkar, gerçek otomatik yedekleme de gelir),
    **veya**
  - **Neon** ya da **Supabase** gibi kalıcı/süresiz ücretsiz PostgreSQL
    sağlayıcılarından birine geçin — kodda hiçbir değişiklik gerekmez,
    yalnızca Render'daki `DATABASE_URL` ortam değişkenini yeni sağlayıcının
    bağlantı adresiyle güncellemeniz yeterlidir.
- Ücretsiz Render web servisleri bir süre kullanılmadığında "uykuya"
  geçebilir; ilk açılan istek birkaç saniye gecikmeli dönebilir.
- Resim/dosyalar sıkıştırılmış biçimde (base64) veritabanına kaydedilir;
  çok sayıda büyük dosya eklerseniz veritabanı boyutu buna göre artar.
- Şirket içinde başka bir veritabanına (MSSQL/MySQL) veya kendi sunucunuza
  taşımak isterseniz, kod herhangi bir hosting sağlayıcısına bağımlı
  değildir — yalnızca `DATABASE_URL` ve veritabanı bağlantı katmanı
  güncellenir.
