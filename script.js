document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÃO =================
    const TEMPO_VIAGEM_TOTAL_HORAS = 72;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    // ===== LOCAL ONDE A MOTO ESTAVA PARADA =====
    const PARADA_PRF = {
        ativo: true,
        coordenada: [-8.7619, -63.9039] // Porto Velho
    };

    // ================= ROTAS =================
    const ROTAS = {
        "651541": {
            destinoNome: "Itaboraí - RJ",
            destinoDesc: "CEP: 24878-055",

            start: [-55.5050, -11.8604], // Sinop
            end: [-42.8597, -22.7448],   // Itaboraí
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

        if (!localStorage.getItem(keyStorage)) {
            localStorage.setItem(keyStorage, Date.now());
        }

        carregarInterface(code);
    }

    function verificarSessaoSalva() {

        const codigo = localStorage.getItem('codigoAtivo');

        if (codigo && ROTAS[codigo]) {
            const input = document.getElementById('access-code');
            if (input) input.value = codigo;
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
                <p><strong>Origem:</strong> Sinop - MT</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
                <p style="font-size:11px;color:#666;">${rotaAtual.destinoDesc}</p>
            `;
        }
    }

    async function buscarRotaReal(start, end) {

        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

        // descobrir ponto mais próximo da PRF
        indiceInicio = encontrarIndiceMaisProximo(PARADA_PRF.coordenada);
    }

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(PARADA_PRF.coordenada, 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB',
            maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10'
        }).addTo(map);

        const motoIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="font-size:35px;">🏍️</div>',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        carMarker = L.marker(fullRoute[indiceInicio], { icon: motoIcon }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO =================

    function iniciarMovimento() {

        const tempoTotal = TEMPO_VIAGEM_TOTAL_HORAS * 3600000;

        const inicio = Date.now();

        loopInterval = setInterval(() => {

            const agora = Date.now();

            const progresso = (agora - inicio) / tempoTotal;

            if (progresso >= 1) {
                clearInterval(loopInterval);
                return;
            }

            const posIndex = indiceInicio + Math.floor(progresso * (fullRoute.length - indiceInicio));

            const pos = fullRoute[posIndex];

            carMarker.setLatLng(pos);

            map.panTo(pos);

        }, 2000);
    }

    // ================= AUX =================

    function encontrarIndiceMaisProximo(coord) {

        let menor = Infinity;
        let indice = 0;

        fullRoute.forEach((p, i) => {

            const d = Math.sqrt(
                Math.pow(p[0] - coord[0], 2) +
                Math.pow(p[1] - coord[1], 2)
            );

            if (d < menor) {
                menor = d;
                indice = i;
            }

        });

        return indice;
    }

});



