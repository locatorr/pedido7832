document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    const TEMPO_VIAGEM_TOTAL_HORAS = 48; // 2 dias
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    // ================= ROTAS =================
    const ROTAS = {
        "651541": {
            destinoNome: "Itapiratins - TO",
            destinoDesc: "Destino Final",

            // Divinópolis - MG
            start: [-44.8839, -20.1453],

            // Itapiratins - TO
            end: [-47.6090, -8.3936],

            offsetHoras: 0
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;
    let indiceInicio = 0;

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

        if (!ROTAS[code]) {
            alert("Código inválido");
            return;
        }

        localStorage.setItem('codigoAtivo', code);

        const keyStorage = CHAVE_INICIO + '_' + code;

        // 🔥 SALVA APENAS UMA VEZ (tempo real absoluto)
        if (!localStorage.getItem(keyStorage)) {
            localStorage.setItem(keyStorage, Date.now());
        }

        carregarInterface(code);
    }

    function verificarSessaoSalva() {

        const codigo = localStorage.getItem('codigoAtivo');

        if (codigo && ROTAS[codigo]) {
            carregarInterface(codigo);
        }
    }

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
                <span id="time-badge" class="status-badge">EM MOVIMENTO</span>
                <p><strong>Origem:</strong> Divinópolis - MG</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
                <p style="font-size:11px;color:#666;">${rotaAtual.destinoDesc}</p>
            `;
        }
    }

    async function buscarRotaReal(start, end) {

        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

        indiceInicio = 0; // começa do início real
    }

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB',
            maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5
        }).addTo(map);

        const caminhaoIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="font-size:35px;">🚚</div>',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        carMarker = L.marker(fullRoute[0], { icon: caminhaoIcon }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO REAL =================

    function iniciarMovimento() {

        const keyStorage = CHAVE_INICIO + '_' + localStorage.getItem('codigoAtivo');
        const inicioSalvo = parseInt(localStorage.getItem(keyStorage));

        const tempoTotal = TEMPO_VIAGEM_TOTAL_HORAS * 3600000;

        loopInterval = setInterval(() => {

            const agora = Date.now();

            // 🔥 cálculo baseado no tempo real (não reinicia)
            const progresso = (agora - inicioSalvo) / tempoTotal;

            if (progresso >= 1) {
                carMarker.setLatLng(fullRoute[fullRoute.length - 1]);
                clearInterval(loopInterval);
                return;
            }

            const posIndex = Math.floor(progresso * (fullRoute.length - 1));
            const pos = fullRoute[posIndex];

            carMarker.setLatLng(pos);
            map.panTo(pos);

        }, 2000);
    }

});
