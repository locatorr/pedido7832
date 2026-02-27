document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    // Teresópolis de Goiás -> Congonhas (Viagem aprox. 17 horas)
    const TEMPO_VIAGEM_TOTAL_HORAS = 17;
    const CHAVE_INICIO = 'inicio_viagem_tere_mg';

    // ================= ROTAS =================
    const ROTAS = {
        "651541": { // <--- SENHA (O CEP)
            destinoNome: "Congonhas - MG",
            destinoDesc: "CEP: 36404-355",
            
            // COORDENADAS [Longitude, Latitude]
            start:    [-49.0489, -16.2833], // Origem: Teresópolis de Goiás - GO
            end:      [-43.8582, -20.4996]  // Destino: Congonhas - MG
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
        // Pega apenas os números (caso a pessoa digite com o traço)
        const code = input.value.replace(/[^0-9]/g, '');
        const errorMsg = document.getElementById('error-msg');

        if (!ROTAS[code]) {
            if(errorMsg) errorMsg.style.display = 'block';
            input.style.borderColor = 'red';
            return;
        }

        localStorage.setItem('codigoAtivo', code);
        
        // Zera o cronômetro para ele começar a viagem do zero agora
        const keyStorage = CHAVE_INICIO + '_' + code;
        localStorage.setItem(keyStorage, Date.now());

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

        // Passamos apenas start e end (rota direta normal)
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

    // Busca a rota direta entre Teresópolis e Congonhas
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

        // Desenha a rota completa
        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            lineJoin: 'round'
        }).addTo(map);

        // Ícone do Caminhão
        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="car-icon" style="font-size:35px;">🚛</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        carMarker = L.marker(fullRoute[0], { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
        L.marker(fullRoute[fullRoute.length - 1]).addTo(map).bindPopup(`<b>Destino:</b> ${rotaAtual.destinoNome}`);

        // Grava o horário que começou a viagem
        const codigoAtivo = localStorage.getItem('codigoAtivo');
        const keyStorage = CHAVE_INICIO + '_' + codigoAtivo;
        if (!localStorage.getItem(keyStorage)) {
            localStorage.setItem(keyStorage, Date.now());
        }

        loopInterval = setInterval(atualizarPosicao, 1000);
        atualizarPosicao();
    }

    function atualizarPosicao() {
        if (fullRoute.length === 0 || !rotaAtual) return;

        const codigoAtivo = localStorage.getItem('codigoAtivo');
        const keyStorage = CHAVE_INICIO + '_' + codigoAtivo;
        
        const inicio = parseInt(localStorage.getItem(keyStorage));
        const agora = Date.now();

        // Calcula a porcentagem do progresso
        let progresso = (agora - inicio) / (TEMPO_VIAGEM_TOTAL_HORAS * 3600000);
        progresso = Math.min(Math.max(progresso, 0), 1); // Trava entre 0 e 1 (0% a 100%)

        // Acha a coordenada atual
        const idx = Math.floor(progresso * (fullRoute.length - 1));
        const pos = fullRoute[idx] || fullRoute[fullRoute.length - 1];

        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, idx);

        // Atualiza a plaquinha
        const badge = document.getElementById('time-badge');
        if (badge) {
            if (progresso >= 1) {
                badge.innerText = "ENTREGUE";
                badge.style.background = "#d1fae5";
                badge.style.color = "#065f46";
            } else {
                const h = ((1 - progresso) * TEMPO_VIAGEM_TOTAL_HORAS).toFixed(1);
                badge.innerText = `EM TRÂNSITO • FALTA ${h}h`;
                badge.style.background = "#e3f2fd";
                badge.style.color = "#1976d2";
            }
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
