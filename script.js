document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    // Goiânia -> Congonhas
    const TEMPO_VIAGEM_TOTAL_HORAS = 18;
    const CHAVE_INICIO = 'inicio_viagem_go_mg';

    // ================= ROTAS =================
    const ROTAS = {
        "651541": { // <--- SENHA (O CEP)
            destinoNome: "Congonhas - MG",
            destinoDesc: "CEP: 36404-355",
            
            // COORDENADAS [Longitude, Latitude]
            start:    [-49.2538, -16.6869], // Origem: Goiânia - GO
            end:      [-43.8582, -20.4996], // Destino: Congonhas - MG
            
            // --- REGRA DE PARADA: TERESÓPOLIS DE GOIÁS ---
            verificarRegras: function(posicaoAtual, map, loopInterval, timeBadge, carMarker) {
                
                // Coordenada em Teresópolis de Goiás (BR-153)
                const CHECKPOINT_TERESOPOLIS = [-16.2833, -49.0489]; 
                
                // 1. PÁRA O CRONÔMETRO E MOVIMENTO
                clearInterval(loopInterval); 
                
                // 2. POSICIONA NA CIDADE
                if(carMarker) carMarker.setLatLng(CHECKPOINT_TERESOPOLIS);
                
                // 3. ZOOM NO LOCAL
                if(map) map.setView(CHECKPOINT_TERESOPOLIS, 15);

                // 4. ALERTA LARANJA (Questões Financeiras)
                if(timeBadge) {
                    timeBadge.innerText = "RETIDO: AGUARDANDO PAGAMENTO";
                    timeBadge.style.backgroundColor = "#e65100"; 
                    timeBadge.style.color = "white";
                    timeBadge.style.border = "2px solid #ff9800";
                    timeBadge.style.animation = "blink 2s infinite";
                }

                // 5. PLAQUINHA INFORMATIVA
                const htmlPlaquinha = `
                    <div style="display: flex; align-items: center; gap: 10px; font-family: sans-serif; min-width: 220px;">
                        <div style="font-size: 28px;">⏳</div>
                        <div style="text-align: left; line-height: 1.2;">
                            <strong style="font-size: 14px; color: #e65100; display: block;">BLOQUEIO FINANCEIRO</strong>
                            <span style="font-size: 11px; color: #333; font-weight: bold;">Teresópolis de Goiás - GO</span><br>
                            <span style="font-size: 11px; color: #666;">Aguardando confirmação de PIX/DOC</span>
                        </div>
                    </div>`;

                if(carMarker) {
                    carMarker.bindTooltip(htmlPlaquinha, {
                        permanent: true,
                        direction: 'top',
                        className: 'finance-label',
                        opacity: 1,
                        offset: [0, -20]
                    }).openTooltip();
                }

                return true;
            }
        }
    };

    // --- CSS PARA O ALERTA ---
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        .finance-label { background: white; border: 2px solid #e65100; border-radius: 8px; padding: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    `;
    document.head.appendChild(style);

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
                <p><strong>Origem:</strong> Goiânia - GO</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
                <p style="font-size: 11px; color: #666;">${rotaAtual.destinoDesc}</p>
            `;
        }
    }

    async function buscarRotaReal(start, end) {
        // Usa as coordenadas normais sem waypoint
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

        if (!localStorage.getItem(CHAVE_INICIO)) {
            localStorage.setItem(CHAVE_INICIO, Date.now());
        }

        loopInterval = setInterval(atualizarPosicao, 1000);
        atualizarPosicao();
    }

    function atualizarPosicao() {
        if (fullRoute.length === 0 || !rotaAtual) return;

        // --- CHECA AS REGRAS (BLOQUEIOS) ---
        const timeBadge = document.getElementById('time-badge');
        if (rotaAtual.verificarRegras) {
            const parou = rotaAtual.verificarRegras([0,0], map, loopInterval, timeBadge, carMarker);
            if (parou) return; // Se a função retornar true, para de executar o resto do movimento
        }

        const inicio = parseInt(localStorage.getItem(CHAVE_INICIO));
        const agora = Date.now();

        let progresso = (agora - inicio) / (TEMPO_VIAGEM_TOTAL_HORAS * 3600000);
        progresso = Math.min(Math.max(progresso, 0), 1); 

        const idx = Math.floor(progresso * (fullRoute.length - 1));
        const pos = fullRoute[idx] || fullRoute[fullRoute.length - 1];

        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, idx);

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
