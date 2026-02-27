document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    // Teresópolis de Goiás -> Congonhas (Aprox. 17 horas totais)
    const TEMPO_VIAGEM_TOTAL_HORAS = 17;
    const CHAVE_INICIO = 'inicio_viagem_liberada_mg';

    // ================= ROTAS =================
    const ROTAS = {
        "651541": { // <--- SENHA (O CEP)
            destinoNome: "Congonhas - MG",
            destinoDesc: "CEP: 36404-355",
            
            // COORDENADAS [Longitude, Latitude]
            start:    [-49.0489, -16.2833], // Origem: Teresópolis de Goiás - GO
            end:      [-43.8582, -20.4996], // Destino: Congonhas - MG
            
            // --- VIAGEM LIBERADA ---
            // Simula que o pagamento caiu e ele já viajou 2 horinhas
            offsetHoras: 2 
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;

    // ================= INIT =================
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', verificarCodigo);
    }
    verificarSessaoSalva();

    // ================= FUNÇÕES =================

    function verificarCodigo() {
        const input = document.getElementById('access-code');
        const code = input.value.replace(/[^0-9]/g, '');
        const errorMsg = document.getElementById('error-msg');

        if (!ROTAS[code]) {
            if(errorMsg) errorMsg.style.display = 'block';
            input.style.borderColor = 'red';
            return;
        }

        localStorage.setItem('codigoAtivo', code);
        
        // Cria uma chave nova para zerar o cronômetro do bloqueio antigo
        const keyStorage = CHAVE_INICIO + '_' + code;
        if (!localStorage.getItem(keyStorage)) {
            localStorage.setItem(keyStorage, Date.now());
        }
        
        carregarInterface(code);
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        const overlay = document.getElementById('login-overlay');
        if (codigo && ROTAS[codigo] && overlay && overlay.style.display !== 'none') {
            const input = document.getElementById('access-code');
            if(input) input.value = codigo;
        }
    }

    function carregarInterface(codigo) {
        rotaAtual = ROTAS[codigo];
        const btn = document.getElementById('btn-login');

        if(btn) {
            btn.innerText = "Calculando Rota...";
            btn.disabled = true;
        }

        buscarRotaReal(rotaAtual.start, rotaAtual.end).then(() => {
            const overlay = document.getElementById('login-overlay');
            const infoCard = document.getElementById('info-card');
            
            if(overlay) overlay.style.display = 'none';
            if(infoCard) infoCard.style.display = 'flex';
            
            atualizarTextoInfo();
            iniciarMapa();
        }).catch(err => {
            console.error(err);
            alert("Erro de conexão com o satélite de rota.");
            if(btn) {
                btn.innerText = "Tentar Novamente";
                btn.disabled = false;
            }
        });
    }

    function atualizarTextoInfo() {
        const infoTextDiv = document.querySelector('.info-text');
        if(infoTextDiv && rotaAtual) {
            infoTextDiv.innerHTML = `
                <h3>Rastreamento Rodoviário</h3>
                <span id="time-badge" class="status-badge">CONECTANDO...</span>
                <p><strong>Origem:</strong> Teresópolis de Goiás - GO</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
                <p style="font-size: 11px; color: #666;">${rotaAtual.destinoDesc}</p>
            `;
        }
    }

    async function buscarRotaReal(start, end) {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
        const data = await fetch(url).then(r => r.json());
        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {
        if (map) return;

        map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB', maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            lineJoin: 'round'
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="car-icon" style="font-size:35px;">🚛</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        carMarker = L.marker(fullRoute[0], { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
        L.marker(fullRoute[fullRoute.length - 1]).addTo(map).bindPopup(`<b>Destino:</b> ${rotaAtual.destinoNome}`);

        if (loopInterval) clearInterval(loopInterval);
        loopInterval = setInterval(atualizarPosicao, 1000);
        atualizarPosicao();
    }

    function atualizarPosicao() {
        if (fullRoute.length === 0 || !rotaAtual) return;

        const codigoAtivo = localStorage.getItem('codigoAtivo');
        const keyStorage = CHAVE_INICIO + '_' + codigoAtivo;
        
        let inicio = parseInt(localStorage.getItem(keyStorage));
        if (!inicio) {
            inicio = Date.now();
            localStorage.setItem(keyStorage, inicio);
        }

        const agora = Date.now();
        const tempoDecorridoMs = agora - inicio;
        const tempoComOffset = tempoDecorridoMs + (rotaAtual.offsetHoras || 0) * 3600000;
        const tempoTotalMs = TEMPO_VIAGEM_TOTAL_HORAS * 60 * 60 * 1000;

        let progresso = tempoComOffset / tempoTotalMs;
        progresso = Math.min(Math.max(progresso, 0), 1); 

        const idx = Math.floor(progresso * (fullRoute.length - 1));
        const pos = fullRoute[idx] || fullRoute[fullRoute.length - 1];

        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, idx);

        const timeBadge = document.getElementById('time-badge');
        if (timeBadge) {
            if (progresso >= 1) {
                timeBadge.innerText = "ENTREGUE";
                timeBadge.style.background = "#d1fae5";
                timeBadge.style.color = "#065f46";
                timeBadge.style.border = "none";
                timeBadge.style.animation = "none";
            } else {
                const msRestantes = tempoTotalMs - tempoComOffset;
                const horasRestantes = (msRestantes / (1000 * 60 * 60)).toFixed(1);
                timeBadge.innerText = `EM TRÂNSITO • FALTA ${horasRestantes}h`;
                timeBadge.style.background = "#e3f2fd";
                timeBadge.style.color = "#1976d2";
                timeBadge.style.border = "none";
                timeBadge.style.animation = "none";
            }
            // Remove qualquer plaquinha de bloqueio que tenha ficado presa no ícone
            carMarker.unbindTooltip(); 
        }
    }

    function desenharLinhaRestante(pos, idx) {
        if(polyline) map.removeLayer(polyline);
        polyline = L.polyline(
            [pos, ...fullRoute.slice(idx + 1)],
            { dashArray: '10,10', color: '#2563eb', weight: 5, lineJoin: 'round' }
        ).addTo(map);
    }
});
