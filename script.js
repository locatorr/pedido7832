document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG
    const ORIGEM = [-21.7878, -46.5613]; 
    // Destino: Viçosa - MG (CEP 36572-362)
    const DESTINO = [-20.7539, -42.8804]; 
    
    // Local da parada (Nepomuceno - MG)
    const NEPOMUCENO = [-21.2358, -45.2353];

    let map;
    let fullRoute = [];
    let prfMarker;
    let polyline;

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

    // ================= MAPA E MARCADOR ESTÁTICO =================
    function iniciarMapa() {
        if (map) return;
        
        // Centraliza o mapa em Nepomuceno com um zoom mais próximo
        map = L.map('map', { zoomControl: false }).setView(NEPOMUCENO, 9);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        // Desenha a rota completa
        polyline = L.polyline(fullRoute, {
            color: '#2563eb', weight: 5, dashArray: '10,10', opacity: 0.8
        }).addTo(map);

        // Ícone customizado da PRF
        const prfIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center; width: 200px; margin-left: -100px;">
                <div style="
                    background:#ef4444; /* Vermelho alerta */
                    color:white;
                    font-size:11px;
                    padding:6px 10px;
                    border-radius:6px;
                    margin-bottom:4px;
                    font-weight:bold;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: inline-block;
                    line-height: 1.3;
                ">
                    🚨 PARADO PELA PRF<br><span style="font-size:10px; font-weight:normal;">Falta de Nota Fiscal</span>
                </div>
                <div style="font-size:35px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));">🚓🚛</div>
            </div>
            `,
            iconSize: [0, 0], 
            iconAnchor: [0, 40] 
        });

        // Adiciona o marcador estático em Nepomuceno
        prfMarker = L.marker(NEPOMUCENO, { icon: prfIcon }).addTo(map);
        
        atualizarStatusBadge();
    }

    // ================= PAINEL DE STATUS =================
    function atualizarStatusBadge() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "RETIDO PELA PRF EM NEPOMUCENO - MG";
            badge.style.background = "#ef4444"; // Fundo vermelho
            badge.style.color = "white";
        }
    }
});
