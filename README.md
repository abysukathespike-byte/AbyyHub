# AbyAi v2

Asisten AI pribadi (chat, cari YouTube, cari gambar Pinterest, info gempa, info cuaca) — buatan Abie Nur Rizky.

## Struktur File

```
AbyyAi_src/
├── index.html       ← Struktur halaman (HTML)
├── style.css         ← Semua styling/tampilan
├── config.js         ← Konfigurasi: URL API, daftar proxy, system prompt AI
├── script.js         ← Logic aplikasi (chat, deep mode, fetch, render, dsb)
├── api/
│   └── proxy.js       ← Vercel Serverless Function - proxy server-to-server (FIX UTAMA, baca di bawah)
├── .env.example       ← Contoh env buat API key di masa depan (lihat catatan di bawah)
└── README.md          ← File ini
```

## PENTING: Kenapa Sebelumnya "Offline" Terus & Cara Fix-nya

Semua CORS proxy gratisan pihak ketiga (`corsproxy.io`, `thingproxy`, dst) itu **nggak reliable** —
ada yang sekarang wajib API key berbayar, ada yang domainnya udah mati, ada yang ngeblokir
domain API tertentu. Solusi permanennya: **`api/proxy.js`**.

Ini serverless function yang jalan di server Vercel kamu sendiri, bukan di browser pengunjung.
CORS itu aturan **browser**, jadi kalau request ke `api.nexadev.my.id` dilakukan dari server
(bukan langsung dari JS yang jalan di browser), CORS sama sekali nggak berlaku. Nggak perlu
proxy pihak ketiga lagi.

**Cara aktifin:** cukup pastikan folder `api/` (isinya `proxy.js`) ikut ke-push/ke-upload ke
project Vercel kamu, sejajar sama `index.html` di root project. Vercel otomatis mendeteksi
file di folder `api/` sebagai serverless function — nggak butuh config tambahan. Push ke
GitHub (kalau project-nya connect ke GitHub) atau `vercel --prod` lagi kalau deploy manual,
lalu re-deploy.

`script.js` akan otomatis coba `/api/proxy` ini duluan sebelum fallback ke proxy publik.

Urutan load di `index.html`: `markdown-it` (CDN) → `style.css` → `config.js` → `script.js`.
`script.js` bergantung pada konstanta yang dideklarasikan di `config.js`, jadi urutannya wajib segitu.

## Cara Jalanin

Karena app ini fetch data ke API eksternal, **jangan dibuka langsung dengan
double-click (`file://...`)** — banyak CORS proxy gratisan nolak request dari
`file://`. Jalankan lewat server lokal, contoh:

```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080/index.html
```

Atau upload ke hosting statis gratis (Netlify Drop, Vercel, GitHub Pages, dll).

## Update v2 — Ringkasan

- **Fix**: semua bug diperbaiki, koneksi ke AI sekarang coba direct fetch dulu baru fallback ke 4 CORS proxy (lebih tahan gangguan), typo domain di `API_PIN`/`API_CUACA` diperbaiki.
- **Baru**: Deep Mode 🧠 — AI mikir 2 tahap di belakang layar sebelum kasih jawaban final yang lebih matang.
- **Baru**: halaman Tips & Trik dan Update Notes, keduanya diakses dari menu utama.
- **Ubah**: halaman About sekarang cuma bisa diakses dari menu utama (bukan dari navbar chat lagi).
- **Halus**: animasi ketikan AI diganti jadi reveal karakter-per-karakter yang lebih smooth dan tanpa flicker (markdown cuma di-render sekali di akhir).
- **Anti-bug**: penanganan data kosong/tidak lengkap dari API (gempa, cuaca, YouTube) sekarang pakai optional chaining biar nggak crash kalau ada field yang hilang.

## Soal `.env` dan "Susah Di-leak" — Catatan Jujur

File `config.js` dipisah dari `script.js` biar rapi dan gampang dikelola,
dan `.env.example` disiapkan buat kalau nanti ada API key beneran yang perlu
ditambahin (sekarang belum ada — `api.nexadev.my.id` itu API publik gratis,
nggak butuh key).

Tapi perlu jujur: **App ini 100% jalan di browser (client-side)**, jadi
apapun yang ada di `config.js`/`script.js` — termasuk kalau nanti ada API key
di sana — tetap bisa dilihat siapa aja lewat "View Source" atau DevTools.
Memisah file itu bikin kode lebih rapi buat dikelola, TAPI **bukan** bikin
kode "nggak bisa di-leak". Untuk benar-benar menyembunyikan sebuah API key,
key itu harus dipanggil dari server (backend), bukan langsung dari kode yang
dikirim ke browser pengguna.
