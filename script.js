document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    const ORIGEM = [-21.7878, -46.5613];
    const DESTINO = [-19.2736, -44.4047];

    // 📍 Bandeira do Sul (ponto de retenção)
    const RETENCAO = [-21.7309, -46.3835];

    let map;
    let retainedMarker;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;

        const code = inputElement.value.trim();

        if (code !== "39450") {
            alert("Código de rastreio inválido.");
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
        if (overlay) overlay.style.display = 'none';

        document.getElementById('info-card').style.display = 'flex';

        iniciarMapa();
    }

    // ================= MAPA =================
    function iniciarMapa() {
        if (map) return;

        map = L.map('map', { zoomControl: false }).setView(RETENCAO, 12);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // linha simples da rota (não depende de API)
        const rotaFake = [ORIGEM, RETENCAO, DESTINO];

        L.polyline(rotaFake, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        const truckIcon = L.divIcon({
            html: `<div style="font-size:32px;">🚛</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        // 🚛 caminhão parado
        retainedMarker = L.marker(RETENCAO, {
            icon: truckIcon
        }).addTo(map);

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
            badge.style.color = "#fff";
        }
    }
});
