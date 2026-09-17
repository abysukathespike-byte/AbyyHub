// ====================================================
// script.js — Logic utama AbyAi (butuh config.js dimuat duluan)
// ====================================================

        // ===== DOM =====
        const md = window.markdownit({ html: false, linkify: true, breaks: true });
        const mainMenu = document.getElementById('mainMenu');
        const btnStartChat = document.getElementById('btnStartChat');
        const btnOpenAbout = document.getElementById('btnOpenAbout');
        const btnOpenTips = document.getElementById('btnOpenTips');
        const btnOpenUpdates = document.getElementById('btnOpenUpdates');
        const chatBox = document.getElementById('chatBox');
        const chatInput = document.getElementById('chatInput');
        const btnSend = document.getElementById('btnSend');
        const btnDeepMode = document.getElementById('btnDeepMode');
        const btnClearChat = document.getElementById('btnClearChat');
        const btnBackMenu = document.getElementById('btnBackMenu');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const modalOverlay = document.getElementById('modalOverlay');
        const btnCancelDelete = document.getElementById('btnCancelDelete');
        const btnConfirmDelete = document.getElementById('btnConfirmDelete');
        const chatPage = document.getElementById('chatPage');
        const aboutPage = document.getElementById('aboutPage');
        const tipsPage = document.getElementById('tipsPage');
        const updatesPage = document.getElementById('updatesPage');
        const btnBackAbout = document.getElementById('btnBackAbout');
        const btnBackTips = document.getElementById('btnBackTips');
        const btnBackUpdates = document.getElementById('btnBackUpdates');
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightboxImg');
        const lightboxClose = document.getElementById('lightboxClose');

        let chatHistory = [];
        let isProcessing = false;
        let deepMode = false;

        // ===== PARTICLE NETWORK =====
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouseX = -1000, mouseY = -1000;

        function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        class Particle {
            constructor() { this.reset(); }
            reset() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.3; this.vy = (Math.random() - 0.5) * 0.3; this.radius = Math.random() * 2 + 1; this.opacity = Math.random() * 0.5 + 0.3; }
            update() { this.x += this.vx; this.y += this.vy; const dx = this.x - mouseX; const dy = this.y - mouseY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < 120) { this.x += dx/dist * 0.2; this.y += dy/dist * 0.2; } if (this.x < 0) this.x = canvas.width; if (this.x > canvas.width) this.x = 0; if (this.y < 0) this.y = canvas.height; if (this.y > canvas.height) this.y = 0; }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(74,122,255,${this.opacity})`; ctx.fill(); }
        }
        function initParticles() { resizeCanvas(); const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000)); particles = []; for (let i = 0; i < count; i++) particles.push(new Particle()); }
        function drawConnections() { for (let i = 0; i < particles.length; i++) { for (let j = i + 1; j < particles.length; j++) { const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < 100) { const opacity = (1 - dist/100) * 0.25; ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(74,122,255,${opacity})`; ctx.lineWidth = 0.5; ctx.stroke(); } } } }
        function animateParticles() { ctx.clearRect(0, 0, canvas.width, canvas.height); for (const p of particles) { p.update(); p.draw(); } drawConnections(); requestAnimationFrame(animateParticles); }
        window.addEventListener('resize', initParticles);
        canvas.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
        canvas.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });
        canvas.addEventListener('touchmove', (e) => { if (e.touches.length > 0) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; } });
        canvas.addEventListener('touchend', () => { mouseX = -1000; mouseY = -1000; });
        initParticles(); animateParticles();

        // ===== LOCALSTORAGE =====
        function saveChatHistory() { try { localStorage.setItem('abyai_v2_chat_history', JSON.stringify(chatHistory)); } catch(e) { console.error('Gagal simpan:', e); } }
        function loadChatHistory() { try { const saved = localStorage.getItem('abyai_v2_chat_history'); if (saved) chatHistory = JSON.parse(saved); if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100); } catch(e) { chatHistory = []; } }

        // ===== RENDER =====
        function renderChat() { chatBox.innerHTML = ''; chatHistory.forEach(msg => { chatBox.appendChild(createMessageElement(msg)); }); scrollToBottom(); }
        function createMessageElement(msg) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.type}${msg.error ? ' error' : ''}`;
            messageDiv.dataset.msgId = msg.id;
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            avatarDiv.innerHTML = msg.type === 'bot' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
            messageDiv.appendChild(avatarDiv);
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            if (msg.type === 'bot' && !msg.error && msg.text) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'bot-actions';
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                copyBtn.title = 'Copy';
                copyBtn.addEventListener('click', () => copyMessage(msg.text));
                actionsDiv.appendChild(copyBtn);
                contentDiv.appendChild(actionsDiv);
            }
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';
            if (msg.type === 'bot') {
                if (msg.html) {
                    bubbleDiv.innerHTML = msg.html;
                } else {
                    bubbleDiv.innerHTML = md.render(msg.text || '');
                }
            } else {
                bubbleDiv.textContent = msg.text;
            }
            contentDiv.appendChild(bubbleDiv);
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'message-timestamp';
            timestampDiv.textContent = msg.timestamp || '';
            contentDiv.appendChild(timestampDiv);
            messageDiv.appendChild(contentDiv);
            return messageDiv;
        }
        function scrollToBottom() { if (chatBox) chatBox.scrollTop = chatBox.scrollHeight; }
        function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

        // ===== TOAST =====
        function showToast(message) {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2000);
        }

        // ===== COPY =====
        async function copyMessage(text) { try { await navigator.clipboard.writeText(text); showToast('Copied!'); } catch(e) { showToast('Gagal copy!'); } }

        // ===== FETCH (DIRECT + CORS PROXY FALLBACK) =====
        async function fetchOnce(fetchUrl, timeout) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(fetchUrl, { signal: controller.signal });
                if (!response.ok) {
                    const bodySnippet = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status} - ${bodySnippet.slice(0, 150)}`);
                }
                return await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
        }

        async function fetchWithProxy(url, timeout = 20000) {
            // 1) Proxy server sendiri (Vercel /api/proxy) - paling reliable, server-to-server, no CORS
            try {
                return await fetchOnce(OWN_PROXY(url), timeout);
            } catch (e) {
                console.warn('Proxy sendiri gagal (mungkin belum ke-deploy), coba direct fetch...', e.message || e);
            }
            // 2) Direct fetch (cuma jalan kalau API target kirim header CORS)
            try {
                return await fetchOnce(url, timeout);
            } catch (e) {
                console.warn('Direct fetch gagal, coba proxy publik...', e.message || e);
            }
            let lastError = null;
            for (const proxyFn of CORS_PROXIES) {
                try {
                    return await fetchOnce(proxyFn(url), timeout);
                } catch (e) {
                    lastError = e;
                    console.warn('Proxy gagal, coba proxy lain...', e.message || e);
                }
            }
            throw lastError || new Error('Semua proxy gagal');
        }

        // ===== EXTRACT RESPONSE =====
        function extractBotResponse(data) {
            if (data && data.data && typeof data.data.message === 'string') return data.data.message;
            if (data && data.data && typeof data.data.response === 'string') return data.data.response;
            if (data && typeof data.message === 'string') return data.message;
            if (data && typeof data.response === 'string') return data.response;
            if (data && typeof data.result === 'string') return data.result;
            return null;
        }

        // ===== GET CONTEXT =====
        function getChatContext() {
            const last50 = chatHistory.filter(m => m.text && !m.error && !m.html).slice(-50);
            return last50.map(m => `${m.type === 'user' ? 'User' : 'AbyAi'}: ${m.text}`).join('\n');
        }

        // ===== SEND MESSAGE =====
        async function sendMessage() {
            const text = chatInput.value.trim();
            if (!text || isProcessing) return;
            const userMsg = { id: Date.now(), type: 'user', text, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false };
            chatHistory.push(userMsg);
            if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100);
            saveChatHistory(); renderChat();
            chatInput.value = ''; autoResizeInput();
            isProcessing = true; btnSend.disabled = true;
            const useDeep = deepMode;
            showTypingIndicator(useDeep ? 'Mikir lebih dalam... 🧠' : null);
            try {
                const context = getChatContext();
                let finalText;
                if (useDeep) {
                    // Pass 1: jawaban draft di belakang layar (tidak ditampilkan)
                    const draftPrompt = `${SYSTEM_PROMPT}\n\n[RIWAYAT CHAT]\n${context}\n[/RIWAYAT CHAT]\n\nPertanyaan user terbaru: ${text}`;
                    const draftData = await fetchWithProxy(`${API_CHAT}${encodeURIComponent(draftPrompt)}`);
                    const draftText = extractBotResponse(draftData);
                    if (!draftText) throw new Error('No draft response');
                    showTypingIndicator('Menyempurnakan jawaban...');
                    // Pass 2: refine draft jadi jawaban final yang ditampilkan
                    const refinePrompt = `${SYSTEM_PROMPT}\n\n[RIWAYAT CHAT]\n${context}\n[/RIWAYAT CHAT]\n\nPertanyaan user terbaru: ${text}\n\n[DRAFT JAWABAN AWAL - JANGAN DITAMPILKAN APA ADANYA, PAKAI SEBAGAI BAHAN]\n${draftText}\n[/DRAFT]\n\nSekarang buat jawaban FINAL yang lebih matang, lebih lengkap, dan lebih akurat dari draft di atas. Tetap pakai format khusus ([YOUTUBE], [PINTEREST], [GEMPA], [CUACA]) kalau relevan. Langsung kasih jawaban final, jangan sebut soal "draft" ke user.`;
                    const finalData = await fetchWithProxy(`${API_CHAT}${encodeURIComponent(refinePrompt)}`);
                    finalText = extractBotResponse(finalData);
                } else {
                    const fullText = `${SYSTEM_PROMPT}\n\n[RIWAYAT CHAT]\n${context}\n[/RIWAYAT CHAT]\n\nPertanyaan user terbaru: ${text}`;
                    const data = await fetchWithProxy(`${API_CHAT}${encodeURIComponent(fullText)}`);
                    finalText = extractBotResponse(data);
                }
                removeTypingIndicator();
                if (!finalText || finalText.length === 0) throw new Error('No response');
                finalText = finalText.replace(/\[ATURAN PENTING[\s\S]*?Pertanyaan user:/g, '').trim();
                await processBotResponse(finalText);
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator();
                const errorMsg = { id: Date.now(), type: 'bot', text: 'Ups, AbyAi lagi gangguan. Coba lagi ya! 😔', timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: true };
                chatHistory.push(errorMsg); saveChatHistory(); renderChat();
                setStatus(false);
            }
            isProcessing = false; btnSend.disabled = false;
            if (chatInput) chatInput.focus();
        }

        // ===== PROCESS BOT RESPONSE =====
        async function processBotResponse(botText) {
            const ytMatch = botText.match(/\[YOUTUBE\]([\s\S]*?)\[\/YOUTUBE\]/);
            const pinMatch = botText.match(/\[PINTEREST\]([\s\S]*?)\[\/PINTEREST\]/);
            const gempaMatch = botText.match(/\[GEMPA\]\[\/GEMPA\]/);
            const cuacaMatch = botText.match(/\[CUACA\]([\s\S]*?)\[\/CUACA\]/);

            if (ytMatch) {
                const query = ytMatch[1].trim();
                const text = botText.replace(/\[YOUTUBE\][\s\S]*?\[\/YOUTUBE\]/g, '').trim();
                if (text) await addBotMessageWithTyping(text, false);
                await searchYouTube(query);
                setStatus(true);
            } else if (pinMatch) {
                const query = pinMatch[1].trim();
                const text = botText.replace(/\[PINTEREST\][\s\S]*?\[\/PINTEREST\]/g, '').trim();
                if (text) await addBotMessageWithTyping(text, false);
                await searchPinterest(query);
                setStatus(true);
            } else if (gempaMatch) {
                const text = botText.replace(/\[GEMPA\]\[\/GEMPA\]/g, '').trim();
                if (text) await addBotMessageWithTyping(text, false);
                await getGempa();
                setStatus(true);
            } else if (cuacaMatch) {
                const kota = cuacaMatch[1].trim();
                const text = botText.replace(/\[CUACA\][\s\S]*?\[\/CUACA\]/g, '').trim();
                if (text) await addBotMessageWithTyping(text, false);
                await getCuaca(kota);
                setStatus(true);
            } else {
                await addBotMessageWithTyping(botText, false);
                setStatus(true);
            }
        }

        // ===== SEARCH YOUTUBE =====
        async function searchYouTube(query) {
            showTypingIndicator();
            try {
                const data = await fetchWithProxy(`${API_YT}${encodeURIComponent(query)}`);
                removeTypingIndicator();
                if (data && data.result && data.result.length > 0) {
                    let html = '<div class="yt-grid">';
                    data.result.slice(0, 8).forEach(video => {
                        const videoId = video.link && video.link.includes('watch?v=') ? video.link.split('watch?v=')[1].split('&')[0] : '';
                        html += `<div class="yt-card" onclick="playYouTube('${videoId}')">
                            <div class="yt-thumb"><img src="${video.imageUrl ?? ''}" alt="${escapeHtml(video.title ?? '')}" loading="lazy"><span class="yt-duration">${video.duration ?? ''}</span></div>
                            <div class="yt-info"><div class="yt-title">${escapeHtml(video.title ?? '')}</div><div class="yt-channel">${escapeHtml(video.channel ?? '')}</div></div>
                        </div>`;
                    });
                    html += '</div><div id="ytPlayerContainer"></div>';
                    const botMsg = { id: Date.now(), type: 'bot', text: `Hasil pencarian YouTube untuk "${query}":`, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false, html };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                } else {
                    const botMsg = { id: Date.now(), type: 'bot', text: `Yah, nggak ketemu video untuk "${query}". Coba kata kunci lain ya!`, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                }
            } catch(e) { handleFeatureError('Gagal nyari video YouTube. Coba lagi ya! 😔'); }
        }
        window.playYouTube = function(videoId) {
            const container = document.getElementById('ytPlayerContainer');
            if (container) { container.innerHTML = `<div class="yt-player"><iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`; scrollToBottom(); }
        };

        // ===== SEARCH PINTEREST =====
        async function searchPinterest(query) {
            showTypingIndicator();
            try {
                const data = await fetchWithProxy(`${API_PIN}${encodeURIComponent(query)}`);
                removeTypingIndicator();
                if (data && data.pins && data.pins.length > 0) {
                    let html = '<div class="pin-masonry">';
                    data.pins.slice(0, 15).forEach(pin => {
                        html += `<div class="pin-card" onclick="openLightbox('${pin.image}')"><img src="${pin.image}" alt="${escapeHtml(pin.title || 'Pinterest')}" loading="lazy"></div>`;
                    });
                    html += '</div>';
                    const botMsg = { id: Date.now(), type: 'bot', text: `Hasil pencarian gambar untuk "${query}":`, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false, html };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                } else {
                    const botMsg = { id: Date.now(), type: 'bot', text: `Yah, nggak ketemu gambar untuk "${query}". Coba kata kunci lain ya!`, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                }
            } catch(e) { handleFeatureError('Gagal nyari gambar. Coba lagi ya! 😔'); }
        }
        window.openLightbox = function(src) { lightboxImg.src = src; lightbox.classList.add('show'); };

        // ===== GET GEMPA =====
        async function getGempa() {
            showTypingIndicator();
            try {
                const data = await fetchWithProxy(API_GEMPA);
                removeTypingIndicator();
                if (data && data.earthquake) {
                    const eq = data.earthquake;
                    let html = `<div class="gempa-card">
                        <div class="gempa-header"><div class="gempa-magnitudo">M ${eq.magnitude ?? '-'}</div><div class="gempa-info"><div class="gempa-location">${eq.location ?? '-'}</div><div class="gempa-datetime">${eq.date ?? ''} - ${eq.time ?? ''}</div></div></div>
                        <div class="gempa-details">
                            <div class="gempa-detail-item"><span>Kedalaman</span>${eq.depth ?? '-'}</div>
                            <div class="gempa-detail-item"><span>Koordinat</span>${eq.coordinates?.latitude_string ?? '-'}, ${eq.coordinates?.longitude_string ?? '-'}</div>
                            <div class="gempa-detail-item"><span>Potensi</span>${eq.potential ?? '-'}</div>
                            <div class="gempa-detail-item"><span>Dirasakan</span>${eq.felt ?? '-'}</div>
                        </div>
                        ${eq.shakemap_url ? `<img src="${eq.shakemap_url}" class="gempa-shakemap" alt="Shakemap">` : ''}
                        ${eq.map_url ? `<a href="${eq.map_url}" target="_blank" class="gempa-btn"><i class="fa-solid fa-map-location-dot"></i> Buka di Google Maps</a>` : ''}
                    </div>`;
                    const botMsg = { id: Date.now(), type: 'bot', text: 'Info gempa terkini:', timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false, html };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                } else { handleFeatureError('Gagal ambil info gempa. Coba lagi ya!'); }
            } catch(e) { handleFeatureError('Gagal ambil info gempa. Coba lagi ya! 😔'); }
        }

        // ===== GET CUACA =====
        async function getCuaca(kota) {
            showTypingIndicator();
            try {
                const data = await fetchWithProxy(`${API_CUACA}${encodeURIComponent(kota)}&index=0`);
                removeTypingIndicator();
                if (data && data.data && data.data.realtime && data.data.realtime.data) {
                    const rt = data.data.realtime.data;
                    const lokasi = rt.lokasi ?? {};
                    const cuaca = rt.cuaca ?? {};
                    let html = `<div class="cuaca-card">
                        <div class="cuaca-header"><img src="${cuaca.image ?? ''}" class="cuaca-icon" alt="${cuaca.weather_desc ?? ''}"><div><div class="cuaca-temp">${cuaca.t ?? '-'}°C</div><div class="cuaca-desc">${cuaca.weather_desc ?? '-'}</div><div class="cuaca-location">${lokasi.desa ?? ''}, ${lokasi.kecamatan ?? ''}, ${lokasi.kotkab ?? ''}, ${lokasi.provinsi ?? ''}</div></div></div>
                        <div class="cuaca-details">
                            <div class="cuaca-detail-item"><span>Kelembaban</span>${cuaca.hu ?? '-'}%</div>
                            <div class="cuaca-detail-item"><span>Angin</span>${cuaca.ws ?? '-'} km/h (${cuaca.wd ?? '-'})</div>
                            <div class="cuaca-detail-item"><span>Visibilitas</span>${cuaca.vs_text ?? '-'}</div>
                            <div class="cuaca-detail-item"><span>Waktu</span>${cuaca.local_datetime ?? '-'}</div>
                        </div>`;
                    if (data.data.forecast && data.data.forecast.data && data.data.forecast.data[0] && data.data.forecast.data[0].cuaca) {
                        const forecastData = data.data.forecast.data[0].cuaca;
                        if (forecastData.length > 0) {
                            html += '<div class="cuaca-forecast"><div class="cuaca-forecast-title">Prakiraan Cuaca</div><div class="cuaca-forecast-grid">';
                            forecastData.slice(0, 8).forEach(f => {
                                html += `<div class="cuaca-forecast-item"><img src="${f.image}" alt="${f.weather_desc}"><div class="forecast-temp">${f.t}°C</div><div class="forecast-time">${f.local_datetime.split(' ')[1]}</div></div>`;
                            });
                            html += '</div></div>';
                        }
                    }
                    html += '</div>';
                    const botMsg = { id: Date.now(), type: 'bot', text: `Info cuaca ${kota}:`, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false, html };
                    chatHistory.push(botMsg); saveChatHistory(); renderChat();
                } else { handleFeatureError(`Gagal ambil info cuaca untuk "${kota}". Pastikan nama kotanya benar ya!`); }
            } catch(e) { handleFeatureError('Gagal ambil info cuaca. Coba lagi ya! 😔'); }
        }

        function handleFeatureError(msg) {
            removeTypingIndicator();
            const botMsg = { id: Date.now(), type: 'bot', text: msg, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: true };
            chatHistory.push(botMsg); saveChatHistory(); renderChat();
        }

        // ===== TYPING =====
        function showTypingIndicator(label) {
            removeTypingIndicator();
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = `<div class="message-avatar" style="background:#4a7aff;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;"><i class="fa-solid fa-robot"></i></div><div class="typing-bubble"><div class="spinner"></div>${label ? `<span class="typing-label">${escapeHtml(label)}</span>` : ''}</div>`;
            chatBox.appendChild(typingDiv);
            scrollToBottom();
        }
        function removeTypingIndicator() { const el = document.getElementById('typingIndicator'); if (el) el.remove(); }

        // ===== TYPING EFFECT =====
        async function addBotMessageWithTyping(text, isError = false) {
            const botMsg = { id: Date.now(), type: 'bot', text: isError ? text : '', timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: isError };
            chatHistory.push(botMsg);
            if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100);
            saveChatHistory();
            if (isError || !text) { renderChat(); return; }
            renderChat();
            const messageElements = chatBox.querySelectorAll('.message.bot');
            const lastMessageEl = messageElements[messageElements.length - 1];
            if (!lastMessageEl) { botMsg.text = text; saveChatHistory(); return; }
            const bubbleEl = lastMessageEl.querySelector('.message-bubble');
            if (!bubbleEl) { botMsg.text = text; saveChatHistory(); return; }
            // Reveal plain text char-by-char (smooth, no markdown re-parse per frame = no flicker),
            // lalu render markdown penuh sekali di akhir.
            bubbleEl.classList.add('typing-cursor');
            const chunkSize = text.length > 400 ? 3 : 1; // teks panjang -> reveal lebih cepat per frame
            let shown = '';
            for (let i = 0; i < text.length; i += chunkSize) {
                if (!bubbleEl.isConnected) break;
                shown = text.slice(0, i + chunkSize);
                bubbleEl.textContent = shown;
                botMsg.text = shown;
                scrollToBottom();
                if (i % 40 === 0) saveChatHistory();
                await new Promise(resolve => setTimeout(resolve, 8));
            }
            bubbleEl.classList.remove('typing-cursor');
            botMsg.text = text;
            if (bubbleEl.isConnected) bubbleEl.innerHTML = md.render(text);
            saveChatHistory();
            scrollToBottom();
        }

        // ===== STATUS =====
        function setStatus(online) {
            if (!statusIndicator || !statusText) return;
            if (online) { statusIndicator.className = 'chat-header-status online'; statusText.textContent = 'Online'; }
            else { statusIndicator.className = 'chat-header-status offline'; statusText.textContent = 'Offline'; }
        }
        async function checkApiStatus() {
            try { const data = await fetchWithProxy(`${API_CHAT}ping`, 10000); setStatus(data && data.status !== false); } catch(e) { console.error('API status check gagal:', e.message || e); setStatus(false); }
        }

        // ===== CLEAR =====
        function clearAllChat() { chatHistory = []; saveChatHistory(); renderChat(); showToast('Chat dihapus!'); }

        // ===== AUTO RESIZE =====
        function autoResizeInput() { if (!chatInput) return; chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px'; }

        // ===== NAVIGATION =====
        function showStaticPage(pageEl) {
            [aboutPage, tipsPage, updatesPage].forEach(p => { p.classList.remove('show'); p.style.display = 'none'; });
            chatPage.style.display = 'none';
            document.querySelector('.navbar').style.display = 'none';
            hideMainMenu();
            pageEl.style.display = 'flex';
            pageEl.classList.add('show');
        }
        function showChatPage() {
            [aboutPage, tipsPage, updatesPage].forEach(p => { p.classList.remove('show'); p.style.display = 'none'; });
            document.querySelector('.navbar').style.display = 'flex';
            chatPage.style.display = 'flex';
        }
        function showMainMenu() {
            [aboutPage, tipsPage, updatesPage].forEach(p => { p.classList.remove('show'); p.style.display = 'none'; });
            document.querySelector('.navbar').style.display = 'none';
            chatPage.style.display = 'none';
            mainMenu.classList.remove('hidden'); mainMenu.style.display = 'flex';
        }
        function hideMainMenu() { mainMenu.classList.add('hidden'); setTimeout(() => { mainMenu.style.display = 'none'; }, 500); }

        // ===== EVENTS =====
        btnStartChat.addEventListener('click', () => { hideMainMenu(); showChatPage(); if (chatInput) chatInput.focus(); });
        btnOpenAbout.addEventListener('click', () => showStaticPage(aboutPage));
        btnOpenTips.addEventListener('click', () => showStaticPage(tipsPage));
        btnOpenUpdates.addEventListener('click', () => showStaticPage(updatesPage));
        btnBackAbout.addEventListener('click', showMainMenu);
        btnBackTips.addEventListener('click', showMainMenu);
        btnBackUpdates.addEventListener('click', showMainMenu);
        btnBackMenu.addEventListener('click', showMainMenu);
        btnSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        chatInput.addEventListener('input', autoResizeInput);
        btnDeepMode.addEventListener('click', () => { deepMode = !deepMode; btnDeepMode.classList.toggle('active', deepMode); showToast(deepMode ? 'Deep Mode aktif 🧠' : 'Deep Mode nonaktif'); });
        btnClearChat.addEventListener('click', () => modalOverlay.classList.add('show'));
        btnCancelDelete.addEventListener('click', () => modalOverlay.classList.remove('show'));
        btnConfirmDelete.addEventListener('click', () => { clearAllChat(); modalOverlay.classList.remove('show'); });
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('show'); });
        lightbox.addEventListener('click', () => lightbox.classList.remove('show'));
        lightboxClose.addEventListener('click', (e) => { e.stopPropagation(); lightbox.classList.remove('show'); });

        // ===== INIT =====
        function init() {
            loadChatHistory();
            if (chatHistory.length === 0) {
                chatHistory.push({ id: Date.now(), type: 'bot', text: 'Halo! Gua AbyAi v2! Gua bisa chat, cari video YouTube, cari gambar, info gempa, dan info cuaca. Mau coba yang mana?', timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), error: false });
                saveChatHistory();
            }
            renderChat();
            checkApiStatus();
            autoResizeInput();
            showMainMenu();
        }
        init();
