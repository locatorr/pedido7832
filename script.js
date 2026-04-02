document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG
    const ORIGEM = [-21.7878, -46.5613]; 
    // Destino: Viçosa - MG (CEP 36572-362)
    const DESTINO = [-20.7539, -42.8804]; 

    // Tempo total de viagem: 12 horas (12 * 60min * 60seg * 1000ms)
    const DURACAO_VIAGEM = 12 * 60 * 60 * 1000; 
    
    // O caminhão começa a viagem no momento exato em que a tela é carregada
    const DATA_SAIDA_FIXA = Date.now();

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', verificarCodigo);
    }
    
    verificarSessaoSalva();

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

    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0="; 
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${ORIGEM[1]},${ORIGEM[0]}&end=${DESTINO[1]},${DESTINO[0]}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {
        if (map) return;
        
        map = L.map('map', { zoomControl: false }).setView([-21.2, -44.7], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb', weight: 5, dashArray: '10,10', opacity: 0.8
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="text-align:center"><div style="background:#2563eb;color:white;font-size:11px;padding:4px 8px;border-radius:6px;margin-bottom:2px;font-weight:bold;box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🚚 EM ROTA</div><div style="font-size:32px;">🚛</div></div>`,
            iconSize: [60,60], iconAnchor: [30,30]
        });

        carMarker = L.marker(ORIGEM, { icon: truckIcon }).addTo(map);
        
        iniciarMovimento();
    }

    function iniciarMovimento() {
        setInterval(() => {
            const agora = Date.now();
            let progresso = (agora - DATA_SAIDA_FIXA) / DURACAO_VIAGEM;

            if (progresso < 0) progresso = 0;
            if (progresso > 1) progresso = 1;

            const posicao = calcularPosicao(progresso);
            carMarker.setLatLng(posicao);

            const badge = document.getElementById('time-badge');
            if (badge) {
                if (progresso >= 1) {
                    badge.innerText = "CARGA ENTREGUE";
                    badge.style.background = "#10b981";
                } else {
                    const msRestantes = DURACAO_VIAGEM * (1 - progresso);
                    const horasRestantes = (msRestantes / (1000 * 60 * 60)).toFixed(1);
                    badge.innerText = `FALTAM ${horasRestantes}H PARA A CHEGADA`;
                }
            }
        }, 2000);
    }

    function calcularPosicao(progresso) {
        if (!fullRoute.length) return ORIGEM;
        
        const posReal = progresso * (fullRoute.length - 1);
        const idx = Math.floor(posReal);
        const t = posReal - idx;
        
        const p1 = fullRoute[idx];
        const p2 = fullRoute[idx + 1] || p1;
        
        return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
    }
});
