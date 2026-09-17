// api/proxy.js
// Vercel Serverless Function — proxy server-to-server ke API AbyAi.
// Kenapa ini fix permanen: CORS itu aturan BROWSER, bukan aturan server.
// Kalau request-nya jalan di server Vercel (bukan langsung dari browser
// pengunjung), nggak ada CORS sama sekali — jadi nggak butuh proxy pihak
// ketiga (corsproxy.io / codetabs / allorigins) yang gampang mati/dibatasi.
//
// Otomatis aktif di Vercel selama file ini ada di folder /api di root
// project (sejajar sama index.html), nggak butuh config tambahan.

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Parameter "url" wajib diisi' });
        return;
    }

    // Whitelist domain biar endpoint ini nggak disalahgunakan jadi open proxy bebas
    const ALLOWED_HOSTS = ['api.nexadev.my.id'];
    let target;
    try {
        target = new URL(url);
    } catch (e) {
        res.status(400).json({ error: 'URL tidak valid' });
        return;
    }
    if (!ALLOWED_HOSTS.includes(target.hostname)) {
        res.status(403).json({ error: 'Domain tidak diizinkan lewat proxy ini' });
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const upstream = await fetch(target.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);

        const contentType = upstream.headers.get('content-type') || '';
        res.status(upstream.status);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (contentType.includes('application/json')) {
            const data = await upstream.json();
            res.json(data);
        } else {
            const text = await upstream.text();
            res.send(text);
        }
    } catch (e) {
        res.status(502).json({ error: 'Gagal ambil data dari API upstream', detail: e.message });
    }
}
