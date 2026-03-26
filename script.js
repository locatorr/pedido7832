document.addEventListener('DOMContentLoaded', () => {

    const TEMPO_VIAGEM_TOTAL_HORAS = 48;
    const CHAVE_INICIO = 'inicio_viagem_mg_1h';

    const ROTAS = {
        "651541": {
            destinoNome: "Itapiratins - TO",
            start: [-20.1453, -44.8839], // Divinópolis
            end: [-8.3936, -47.6090],   // Itapiratins
        }
    };

    let map, polyline, carMarker, fullRoute = [];

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    function verificarCodigo() {
        const input = document.getElementById('access-code');
        const code = input.value.replace(/\D/g, '');

        if (!ROTAS[code]) {
            alert("Código inválido");
            return;
        }

        localStorage.setItem('codigoAtivo', code);

        const key = CHAVE_INICIO + '_' + code;
        if (!localStorage.getItem(key)) localStorage.setItem(key, Date.now());

        carregarInterface(code);
    }

    function verificarSessaoSalva() {
        const code = localStorage.getItem('codigoAtivo');
        if (code && ROTAS[code]) {
            const input = document.getElementById('access-code');
            if(input) input.value = code;
            carregarInterface(code);
        }
    }

    async function carregarInterface(code) {
        const rota = ROTAS[code];

        try {
            await buscarRotaReal(rota.start, rota.end);

            // 🔹 Mostrar info
            document.getElementById('login-overlay').style.display = 'none';
            const infoCard = document.getElementById('info-card');
            if(infoCard) infoCard.style.display = 'flex';
            const infoText = document.querySelector('.info-text');
            if(infoText) {
                infoText.innerHTML = `
                    <h3>Rastreamento Rodoviário</h3>
                    <span class="status-badge">EM MOVIMENTO</span>
                    <p><strong>Origem:</strong> Divinópolis - MG</p>
                    <p><strong>Destino:</strong> ${rota.destinoNome}</p>
                `;
            }

            iniciarMapa();
        } catch (e) {
            alert("Erro ao calcular a rota. Tente novamente.");
        }
    }

    async function buscarRotaReal(start, end) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.routes || !data.routes.length) throw "erro";
            fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        } catch {
            // fallback linha reta
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
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
        polyline = L.polyline(fullRoute, { color: 'blue', weight: 4 }).addTo(map);
        const icon = L.divIcon({ html: '🚚', className: '', iconSize: [30, 30] });
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
