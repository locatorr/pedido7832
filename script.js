document.addEventListener('DOMContentLoaded', () => {

    const TEMPO_VIAGEM_TOTAL_HORAS = 48;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    const ROTAS = {
        "651541": {
            destinoNome: "Itapiratins - TO",

            // ✅ FORMATO CORRETO: [LAT, LNG]
            start: [-20.1453, -44.8839], // Divinópolis
            end: [-8.3936, -47.6090],   // Itapiratins
        }
    };

    let map, polyline, carMarker;
    let fullRoute = [];

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    function verificarCodigo() {

        const code = document.getElementById('access-code').value.replace(/\D/g, '');

        if (!ROTAS[code]) {
            alert("Código inválido");
            return;
        }

        localStorage.setItem('codigoAtivo', code);

        const key = CHAVE_INICIO + '_' + code;

        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, Date.now());
        }

        carregar(code);
    }

    function verificarSessaoSalva() {
        const code = localStorage.getItem('codigoAtivo');
        if (code && ROTAS[code]) carregar(code);
    }

    function carregar(code) {

        const rota = ROTAS[code];

        buscarRotaReal(rota.start, rota.end).then(() => {
            iniciarMapa();
        });

    }

    async function buscarRotaReal(start, end) {

        try {
            // 🔥 OSRM usa [LNG, LAT]
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

            const res = await fetch(url);
            const data = await res.json();

            if (!data.routes || !data.routes.length) throw "erro";

            fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

        } catch (e) {

            console.warn("API falhou, usando linha reta");

            // 🔥 fallback SEM ERRO (linha reta)
            fullRoute = gerarLinhaReta(start, end, 500);
        }
    }

    function gerarLinhaReta(start, end, steps) {

        const rota = [];

        for (let i = 0; i <= steps; i++) {

            const lat = start[0] + (end[0] - start[0]) * (i / steps);
            const lng = start[1] + (end[1] - start[1]) * (i / steps);

            rota.push([lat, lng]);
        }

        return rota;
    }

    function iniciarMapa() {

        map = L.map('map').setView(fullRoute[0], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: 'blue',
            weight: 4
        }).addTo(map);

        const icon = L.divIcon({
            html: '🚚',
            className: '',
            iconSize: [30, 30]
        });

        carMarker = L.marker(fullRoute[0], { icon }).addTo(map);

        iniciarMovimento();
    }

    function iniciarMovimento() {

        const key = CHAVE_INICIO + '_' + localStorage.getItem('codigoAtivo');
        const inicio = parseInt(localStorage.getItem(key));

        const tempoTotal = TEMPO_VIAGEM_TOTAL_HORAS * 3600000;

        setInterval(() => {

            let progresso = (Date.now() - inicio) / tempoTotal;
            if (progresso > 1) progresso = 1;

            const index = Math.floor(progresso * (fullRoute.length - 1));
            const pos = fullRoute[index];

            if (!pos) return;

            carMarker.setLatLng(pos);
            map.setView(pos, map.getZoom());

        }, 1000);
    }

});
