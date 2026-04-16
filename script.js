document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG
    const ORIGEM = [-21.7878, -46.5613];

    // Destino: Paraopeba - MG
    const DESTINO = [-19.2736, -44.4047];

    // 📍 Ponto de retenção: Bandeira do Sul - MG
    const RETENCAO = [-21.7309, -46.3835];

    const STORAGE_START_KEY = 'inicio_viagem';

    let map;
    let fullRoute = [];
    let retainedMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;

        const code = inputElement.value.trim();

        if (code !== "39450") {
            alert("Código de rastreio inválido. Tente novamente.");
            inputElement.value = "";
            localStorage.removeItem('codigoAtivo');
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
        const btnLogin = document.getElementById('btn-login');

        if (btnLogin) btnLogin.innerText = "Consultando...";

        buscarRotaNaAPI().then(() => {
            if (overlay) overlay.style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';
            iniciarMapa();
        });
    }

    // ================= BUSCA NA API =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "SEU_TOKEN_AQUI";

        const start = `${ORIGEM[1]},${ORIGEM[0]}`;
        const end = `${DESTINO[1]},${DESTINO[0]}`;

        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${start}&end=${end}`;
        const response = await fetch(url);
        const data = await response.json();

        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================
    function iniciarMapa() {
        if (map) return;

        // 🔴 mapa já inicia na retenção
        map = L.map('map', { zoomControl: false }).setView(RETENCAO, 12);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // rota continua visível
        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        const truckStatusIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size:32px;">🚛</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        // 🔴 caminhão já começa parado na retenção
        retainedMarker = L.marker(RETENCAO, {
            icon: truckStatusIcon,
            zIndexOffset: 1000
        }).addTo(map);

        // popup informativo
        retainedMarker
            .bindPopup("🚫 Retido pela PRF em Bandeira do Sul<br>Motivo: Falta de nota fiscal")
            .openPopup();

        atualizarStatus();
    }

    // ================= STATUS =================
    function atualizarStatus() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "RETIDO PELA PRF - FALTA DE NOTA FISCAL";
            badge.style.background = "#dc2626";
            badge.style.color = "white";
        }
    }
});
