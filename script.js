document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    const TEMPO_VIAGEM_TOTAL_HORAS = 72;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h'; 

    // ===== LOCAL DA PARADA PRF (PORTO VELHO) =====
    const PARADA_PRF = {
        ativo: true,
        coordenada: [-8.7619, -63.9039], // Porto Velho - RO
        mensagem: "🚔 PARADO PELA PRF • Falta de documentação"
    };

    // ================= ROTAS =================
    const ROTAS = {
        "651541": {
            destinoNome: "Itaboraí - RJ",
            destinoDesc: "CEP: 24878-055",
            
            start: [-55.5050, -11.8604], // Sinop
            end: [-42.8597, -22.7448], // Itaboraí
            
            offsetHoras: 0 
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;
    let marcadorPRF = null;

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
        });
    }

    function atualizarTextoInfo() {
        const infoTextDiv = document.querySelector('.info-text');
        if(infoTextDiv && rotaAtual) {
            infoTextDiv.innerHTML = `
                <h3>Rastreamento Rodoviário</h3>
                <span id="time-badge" class="status-badge">CONECTANDO...</span>
                <p><strong>Origem:</strong> Sinop - MT</p>
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

        map = L.map('map', { zoomControl: false }).setView([-8.7619, -63.9039], 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB', maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10'
        }).addTo(map);

        // ===== ICONE DA MOTO =====
        const motoIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="font-size:35px;">🏍️</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        carMarker = L.marker(PARADA_PRF.coordenada, { icon: motoIcon }).addTo(map);

        // ===== MARCADOR DA PRF =====
        if (PARADA_PRF.ativo) {

            const prfIcon = L.divIcon({
                html: '<div style="font-size:30px;">🚔</div>',
                iconSize: [30,30],
                className: ''
            });

            marcadorPRF = L.marker(PARADA_PRF.coordenada, { icon: prfIcon })
            .addTo(map)
            .bindPopup("<b>PRF - Polícia Rodoviária Federal</b><br>Moto parada por falta de documentação")
            .openPopup();
        }

        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "🚔 PARADO NA PRF";
            badge.style.background = "#fee2e2";
            badge.style.color = "#991b1b";
        }
    }

});


