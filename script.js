document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Palmas - TO
    const ORIGEM = [-10.2491, -48.3243]; 

    // Destino: São Paulo - SP
    const DESTINO = [-23.5505, -46.6333]; 
    
    // Duração total da entrega: 1 dia (24h)
    const DURACAO_TOTAL_MS = 24 * 60 * 60 * 1000;

    let map;
    let fullRoute = [];
    let prfMarker;
    let polyline;
    let startTime;

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', verificarCodigo);
    }
    
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;
        
        const code = inputElement.value.trim();
        if (code !== "39450") {
            alert("Código de rastreio inválido.");
            return;
        }
        
        localStorage.setItem('codigoAtivo', code);
        carregarInterface();
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        if (codigo === "39450") carregarInterface();
    }

    function carregarInterface() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        
        const infoCard = document.getElementById('info-card');
        if (infoCard) infoCard.style.display = 'flex';
        
        buscarRotaNaAPI().then(() => iniciarMapa());
    }

    // ================= BUSCA NA API =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0="; 
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${ORIGEM[1]},${ORIGEM[0]}&end=${DESTINO[1]},${DESTINO[0]}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA E MOVIMENTO =================
    function iniciarMapa() {
        if (map) return;
        
        map = L.map('map', { zoomControl: false }).setView(ORIGEM, 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb', weight: 5, opacity: 0.9
        }).addTo(map);

        const prfIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center;">
                <div style="font-size:34px;">🏍️</div>
                <div style="
                    background:#22c55e;
                    color:white;
                    font-size:11px;
                    padding:4px 8px;
                    border-radius:5px;
                    font-weight:bold;
                ">
                    EM TRÂNSITO
                </div>
            </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 20]
        });

        prfMarker = L.marker(fullRoute[0], { icon: prfIcon }).addTo(map);

        startTime = Date.now();
        animarVeiculo();
        atualizarStatusBadge();
    }

    // ================= ANIMAÇÃO EM TEMPO REAL =================
    function animarVeiculo() {
        setInterval(() => {
            const agora = Date.now();
            const progresso = Math.min((agora - startTime) / DURACAO_TOTAL_MS, 1);
            const index = Math.floor(progresso * (fullRoute.length - 1));

            if (fullRoute[index]) {
                prfMarker.setLatLng(fullRoute[index]);
            }
        }, 1000);
    }

    // ================= STATUS =================
    function atualizarStatusBadge() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "EM TRANSPORTE • PALMAS-TO ➜ SÃO PAULO-SP";
            badge.style.background = "#22c55e";
            badge.style.color = "white";
        }
    }
});
