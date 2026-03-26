document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    const TEMPO_VIAGEM_TOTAL_HORAS = 48;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    // ================= PARADA PRF =================
    const PARADA_PRF = {
        ativo: true,
        coordenada: [-19.9, -44.0], // próximo de Divinópolis
        nome: "PRF - MG",
        motivo: "Veículo retido por falta de nota fiscal"
    };

    // ================= ROTAS =================
    const ROTAS = {
        "651541": {
            destinoNome: "Itapiratins - TO",
            destinoDesc: "Destino Final",

            start: [-44.8839, -20.1453], // Divinópolis
            end: [-47.6090, -8.3936],   // Itapiratins
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;

    // ================= INIT =================
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {

        const input = document.getElementById('access-code');
        const code = input.value.replace(/[^0-9]/g, '');

        if (!ROTAS[code]) {
            alert("Código inválido");
            return;
        }

        localStorage.setItem('codigoAtivo', code);

        const key = CHAVE_INICIO + '_' + code;
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, Date.now());
        }

        carregarInterface(code);
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        if (codigo && ROTAS[codigo]) {
            carregarInterface(codigo);
        }
    }

    // ================= INTERFACE =================
    function carregarInterface(codigo) {

        rotaAtual = ROTAS[codigo];

        buscarRotaReal(rotaAtual.start, rotaAtual.end).then(() => {

            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';

            atualizarTextoInfo();
            iniciarMapa();
        });
    }

    function atualizarTextoInfo() {

        const infoTextDiv = document.querySelector('.info-text');

        if (infoTextDiv && rotaAtual) {

            infoTextDiv.innerHTML = `
                <h3>Rastreamento Rodoviário</h3>
                <span class="status-badge" style="background:red;">
                    VEÍCULO RETIDO
                </span>
                <p><strong>Origem:</strong> Divinópolis - MG</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
                <p style="color:red;"><strong>${PARADA_PRF.motivo}</strong></p>
            `;
        }
    }

    // ================= ROTA =================
    async function buscarRotaReal(start, end) {

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

            const data = await fetch(url).then(r => r.json());

            fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        } catch (e) {
            // fallback linha reta
            fullRoute = [start, end];
        }
    }

    // ================= MAPA =================
    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(PARADA_PRF.coordenada, 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB',
            maxZoom: 18
        }).addTo(map);

        // rota desenhada
        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5
        }).addTo(map);

        // 🚚 Caminhão parado na PRF
        const caminhaoIcon = L.divIcon({
            html: '<div style="font-size:35px;">🚚</div>',
            className: '',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        carMarker = L.marker(PARADA_PRF.coordenada, { icon: caminhaoIcon }).addTo(map);

        // 🚔 PRF
        const prfIcon = L.divIcon({
            html: '<div style="font-size:30px;">🚔</div>',
            className: '',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        L.marker(PARADA_PRF.coordenada, { icon: prfIcon })
            .addTo(map)
            .bindPopup(`<b>${PARADA_PRF.nome}</b><br>${PARADA_PRF.motivo}`)
            .openPopup();

        iniciarMovimento();
    }

    // ================= MOVIMENTO =================
    function iniciarMovimento() {
        // 🚫 BLOQUEADO
        console.log("Veículo retido na PRF - não se move");
    }

});
