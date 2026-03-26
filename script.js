document.addEventListener('DOMContentLoaded', () => {

    const TEMPO_VIAGEM_TOTAL_HORAS = 48;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    const ROTAS = {
        "651541": {
            destinoNome: "Itapiratins - TO",
            destinoDesc: "Destino Final",

            start: [-44.8839, -20.1453], // Divinópolis
            end: [-47.6090, -8.3936],   // Itapiratins
        }
    };

    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    function verificarCodigo() {

        const code = document.getElementById('access-code').value.replace(/[^0-9]/g, '');

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
        if (codigo && ROTAS[codigo]) carregarInterface(codigo);
    }

    function carregarInterface(codigo) {

        rotaAtual = ROTAS[codigo];

        buscarRotaReal(rotaAtual.start, rotaAtual.end)
            .then(() => {
                iniciarMapa();
            })
            .catch(() => {
                alert("Erro ao calcular rota");
            });
    }

    async function buscarRotaReal(start, end) {

        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes || !data.routes.length) {
            throw new Error("Rota inválida");
        }

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {

        map = L.map('map').setView(fullRoute[0], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5
        }).addTo(map);

        const icon = L.divIcon({
            html: '<div style="font-size:30px;">🚚</div>',
            className: ''
        });

        carMarker = L.marker(fullRoute[0], { icon }).addTo(map);

        iniciarMovimento();
    }

    function iniciarMovimento() {

        const key = CHAVE_INICIO + '_' + localStorage.getItem('codigoAtivo');
        const inicio = parseInt(localStorage.getItem(key));

        const tempoTotal = TEMPO_VIAGEM_TOTAL_HORAS * 3600000;

        setInterval(() => {

            const agora = Date.now();
            let progresso = (agora - inicio) / tempoTotal;

            // 🔥 trava no máximo 1 (chegar no destino)
            if (progresso > 1) progresso = 1;

            const index = Math.floor(progresso * (fullRoute.length - 1));
            const pos = fullRoute[index];

            if (!pos) return;

            carMarker.setLatLng(pos);

            // movimento suave de câmera
            map.setView(pos, map.getZoom(), { animate: true });

        }, 1000);
    }

});
