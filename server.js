// WILO Araç Takip Sistemi - Backend Sunucusu
//
// Bu sunucu üç görev üstlenir:
// 1) public/ klasöründeki arayüzü (index.html) yayınlamak
// 2) Araç ve parametre verilerini kalıcı olarak bir veritabanında saklamak
// 3) Uygulamaya ŞİFRELİ GİRİŞ zorunluluğu getirmek (uygulama internete
//    açık olduğu için herkesin şifresiz erişebilmesini engellemek amacıyla)
//
// Kalıcılık şu şekilde çalışır:
// - DATABASE_URL ortam değişkeni tanımlıysa (Render üzerinde bir PostgreSQL
//   veritabanı bağladığınızda otomatik olarak tanımlanır) tüm veriler
//   PostgreSQL'de saklanır ve sunucu yeniden başlasa/deploy edilse bile
//   KAYBOLMAZ.
// - DATABASE_URL tanımlı değilse (örn. bilgisayarınızda hızlı bir test
//   yaparken) sunucu, veriyi yalnızca bellekte tutar; bu durumda sunucu
//   yeniden başladığında veriler sıfırlanır. Bu yalnızca yerel geliştirme
//   için bir yedek moddur, canlı ortamda KULLANILMAMALIDIR.
//
// Şifreli giriş şu şekilde çalışır:
// - APP_PASSWORD ortam değişkenine belirlediğiniz şifreyi yazarsınız
//   (bkz. README.md → "Giriş Şifresini Ayarlama").
// - Kullanıcı /login.html üzerinden bu şifreyi girer; doğruysa tarayıcıya
//   güvenli bir oturum çerezi (session cookie) verilir.
// - Bu çerez olmadan hiçbir sayfa veya /api/state ucu görüntülenemez;
//   tüm istekler otomatik olarak giriş sayfasına yönlendirilir.
// - APP_PASSWORD tanımlı değilse sunucu uyarı basar ve GÜVENLİ OLMAYAN
//   şekilde şifresiz erişime izin verir (yalnızca yerel test için).

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const { DEFAULT_PARAMS, DEFAULT_CARS } = require('./seed-data');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || 'wilo-arac-takip-varsayilan-anahtar-lutfen-degistirin';

app.set('trust proxy', 1); // Render gibi ters proxy arkasında çalışırken güvenli çerezler için gerekli

// ============================================================
// VERİTABANI (POSTGRESQL) HAVUZU
// Oturum bilgisi (giriş durumu) de dahil olmak üzere burada tanımlanır,
// çünkü session middleware'i bu havuzu kullanacak.
// ============================================================
let pool = null;
if (DATABASE_URL) {
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
} else {
    console.warn(
        '[UYARI] DATABASE_URL tanımlı değil. Veriler yalnızca bellekte tutulacak ve ' +
        'sunucu yeniden başladığında (veya Render yeniden deploy ettiğinde) SİLİNECEK. ' +
        'Kalıcı kayıt için bir PostgreSQL veritabanı oluşturup DATABASE_URL ortam ' +
        'değişkenini tanımlayın (bkz. README.md).'
    );
}

// Resim (base64) içeren hasar/ruhsat/sigorta/ceza kayıtları büyük
// olabileceği için JSON limiti yüksek tutuluyor. Yine de sınırsız değil:
// istemci tarafında da (index.html) tekil PDF/dosya boyutu 8 MB ile
// sınırlandırıldı, böylece toplam veri makul kalır.
app.use(express.json({ limit: '60mb' }));

// Gövde 60 MB sınırını aştığında Express varsayılan olarak HTML hata
// sayfası döner; bu da istemcide "sunucuya ulaşılamadı" gibi yanıltıcı
// bir mesaja yol açıyordu. Bunun yerine düzgün bir JSON hatası dönüyoruz.
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Gönderilen veri çok büyük (60 MB sınırı aşıldı).' });
    }
    next(err);
});

// Oturum (giriş) bilgisi ARTIK BELLEKTE DEĞİL, PostgreSQL'de saklanır.
// Render'ın ücretsiz sunucusu 15 dakika işlem olmadığında "uykuya"
// geçip yeni bir istekte sıfırdan başlıyor; oturum yalnızca bellekte
// tutulsaydı bu durumda kullanıcı otomatik olarak giriş ekranına
// düşerdi (yaşanan "süre doldu" sorununun kök nedeni buydu). Veritabanı
// bağlantısı yoksa (yalnızca yerel test), oturum yine bellekte tutulur.
app.use(session({
    store: pool ? new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }) : undefined,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 gün
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

if (!APP_PASSWORD) {
    console.warn(
        '[UYARI] APP_PASSWORD ortam değişkeni tanımlı değil. Uygulama ŞİFRESİZ ve ' +
        'HERKESE AÇIK şekilde çalışıyor. Canlı ortamda mutlaka APP_PASSWORD tanımlayın ' +
        '(bkz. README.md).'
    );
}

// ============================================================
// KİMLİK DOĞRULAMA (LOGIN) UÇLARI
// ============================================================
app.post('/api/login', (req, res) => {
    if (!APP_PASSWORD) {
        req.session.loggedIn = true;
        return res.json({ ok: true });
    }
    const { password } = req.body || {};
    if (password && password === APP_PASSWORD) {
        req.session.loggedIn = true;
        return res.json({ ok: true });
    }
    return res.status(401).json({ error: 'Şifre hatalı.' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

app.get('/api/session', (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.loggedIn) || !APP_PASSWORD });
});

// login.html, üzerindeki statik varlıklar (yok) ve login/health API'leri
// hariç HER İSTEK için giriş şartı arar.
function requireAuth(req, res, next) {
    if (!APP_PASSWORD) return next(); // şifre tanımlı değilse serbest (yalnızca yerel test)
    if (req.session && req.session.loggedIn) return next();
    if (req.path === '/login.html' || req.path === '/api/login' || req.path === '/api/health' || req.path === '/api/session') {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
    }
    return res.redirect('/login.html');
}

app.use(requireAuth);

// ============================================================
// KALICI VERİ DEPOSU (yukarıda tanımlı "pool" burada da kullanılır)
// ============================================================
let memoryStore = null; // Yalnızca DATABASE_URL yokken kullanılan geçici bellek deposu

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
}

async function saveStateToDb(cars, params) {
    await pool.query(
        `INSERT INTO app_state (key, value, updated_at) VALUES ('cars', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(cars)]
    );
    await pool.query(
        `INSERT INTO app_state (key, value, updated_at) VALUES ('params', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(params)]
    );
}

async function getState() {
    if (pool) {
        await ensureTable();
        const { rows } = await pool.query(
            `SELECT key, value FROM app_state WHERE key IN ('cars', 'params')`
        );
        let cars = null;
        let params = null;
        rows.forEach((r) => {
            if (r.key === 'cars') cars = r.value;
            if (r.key === 'params') params = r.value;
        });

        // Veritabanı boşsa (ilk kurulum), varsayılan verilerle doldur.
        if (cars === null || params === null) {
            cars = cars ?? DEFAULT_CARS;
            params = params ?? DEFAULT_PARAMS;
            await saveStateToDb(cars, params);
        }
        return { cars, params };
    }

    // DATABASE_URL yoksa bellekten oku (yalnızca yerel test için)
    if (!memoryStore) {
        memoryStore = { cars: DEFAULT_CARS, params: DEFAULT_PARAMS };
    }
    return memoryStore;
}

// Mevcut tüm verileri getirir
app.get('/api/state', async (req, res) => {
    try {
        const state = await getState();
        res.json(state);
    } catch (err) {
        console.error('Veri okuma hatası:', err);
        res.status(500).json({ error: 'Veriler okunamadı.' });
    }
});

// Tüm araç ve parametre verilerini kaydeder (uygulama her değişiklikte bu uca yazar)
app.post('/api/state', async (req, res) => {
    try {
        const { cars, params } = req.body || {};
        if (!Array.isArray(cars) || typeof params !== 'object' || params === null) {
            return res.status(400).json({ error: 'Geçersiz veri formatı.' });
        }

        if (pool) {
            await ensureTable();
            await saveStateToDb(cars, params);
        } else {
            memoryStore = { cars, params };
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('Veri kaydetme hatası:', err);
        res.status(500).json({ error: 'Veriler kaydedilemedi.' });
    }
});

// Basit bir sağlık kontrolü ucu (Render bunu deploy sonrası kontrol edebilir)
app.get('/api/health', (req, res) => {
    res.json({ ok: true, database: pool ? 'postgresql' : 'bellek (kalıcı değil)', authRequired: !!APP_PASSWORD });
});

// Statik arayüz dosyaları (bu noktaya kadar gelindiyse requireAuth geçilmiştir)
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`WILO Araç Takip Sistemi ${PORT} portunda çalışıyor.`);
    console.log(`Veri deposu: ${pool ? 'PostgreSQL (kalıcı)' : 'Bellek (KALICI DEĞİL)'}`);
    console.log(`Şifreli giriş: ${APP_PASSWORD ? 'AKTİF' : 'PASİF (APP_PASSWORD tanımlı değil)'}`);
});
