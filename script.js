document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG
    const ORIGEM = [-21.7878, -46.5613]; 
    // Destino: Viçosa - MG (CEP 36572-362)
    const DESTINO = [-20.7539, -42.8804]; 

    // Tempo total de viagem: 15 horas
    const DURACAO_VIAGEM = 15 * 60 * 60 * 1000; 
    
    // DATA FIXA: O caminhão saiu dia 31/03/2026 às 08:00:00 da manhã
    // Nota: No JavaScript, o mês começa do zero (Janeiro = 0, Fevereiro = 1, Março = 2)
    const DATA_SAIDA_FIXA = new Date(2026, 2, 31, 8, 0, 0).getTime();

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN (A TELA INICIAL CONTINUA AQUI) =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;

        const code = inputElement.value.trim();
        
        // Verifica se o código é exatamente 39450
        if (code !== "39450") {
            alert("Código de rastreio inválido. Tente novamente.");
            inputElement.value = ""; // Limpa o campo para o usuário tentar de novo
            localStorage.removeItem('codigoAtivo'); // Limpa qualquer sessão errada
            return;
        }

        // Se o código estiver certo, salva e carrega
        localStorage.setItem('codigoAtivo', code);
        carregarInterface();
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        
        if (codigo) {
            if (codigo === "39455") {
                carregarInterface();
            } else {
                // Se tinha uma sessão salva com código velho/errado, apaga ela
                localStorage.removeItem('codigoAtivo');
            }
        }
    }

    function carregarInterface() {
        const overlay = document.getElementById('login-overlay');
        const btnLogin = document.getElementById('btn-login');
        
        if (btnLogin) btnLogin.innerText = "Consultando...";

        // Inicia a busca real na API do OpenRouteService
        buscarRotaNaAPI().then(() => {
            if (overlay) overlay.style.display = 'none'; // Esconde a tela de login
            document.getElementById('info-card').style.display = 'flex'; // Mostra o card de tempo
            iniciarMapa();
        }).catch(err => {
            alert("Erro na API de Rotas. Verifique o console.");
            if (btnLogin) btnLogin.innerText = "Rastrear Carga";
        });
    }

    // ================= BUSCA NA API (OpenRouteService) =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0="; 

        const start = `${ORIGEM[1]},${ORIGEM[0]}`;
        const end = `${DESTINO[1]},${DESTINO[0]}`;
        
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${start}&end=${end}`;

        console.log("Consultando OpenRouteService...");

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API ORS: ${response.status}`);
        }

        const data = await response.json();
        
        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
        console.log("Rota carregada com sucesso! Total de pontos da estrada:", fullRoute.length);
    }

    // ================= MAPA =================
    function iniciarMapa() {
        if (map) return;

        // Centraliza o mapa inicialmente em um ponto médio entre Poços de Caldas e Viçosa
        map = L.map('map', { zoomControl: false }).setView([-21.2, -44.7], 7);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb', 
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center">
                <div style="
                    background:#2563eb;
                    color:white;
                    font-size:11px;
                    padding:4px 8px;
                    border-radius:6px;
                    margin-bottom:2px;
                    font-weight:bold;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">
                🚚 EM ROTA
                </div>
                <div style="font-size:32px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));">🚛</div>
            </div>
            `,
            iconSize: [60,60],
            iconAnchor: [30,30]
        });

        carMarker = L.marker(ORIGEM, {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO (DATA FIXA PARA TODOS OS DISPOSITIVOS) =================
    function iniciarMovimento() {
        setInterval(() => {
            const agora = Date.now();
            
            // Calcula o progresso com base na DATA_SAIDA_FIXA
            let progresso = (agora - DATA_SAIDA_FIXA) / DURACAO_VIAGEM;

            if (progresso < 0) progresso = 0; // Se abrir antes das 08:00, fica parado na origem
            if (progresso > 1) progresso = 1; // Se passar das 15h, fica no destino

            const posicao = calcularPosicao(progresso);

            carMarker.setLatLng(posicao);
            map.panTo(posicao, { animate: true, duration: 1.5 });

            // Atualiza o tempo restante no card
            const badge = document.getElementById('time-badge');
            if (badge) {
                if (progresso >= 1) {
                    badge.innerText = "CARGA ENTREGUE";
                    badge.style.background = "#10b981"; // Verde
                    badge.style.color = "white";
                } else if (progresso === 0) {
                    badge.innerText = "AGUARDANDO SAÍDA";
                } else {
                    const horasRestantes = (15 * (1 - progresso)).toFixed(1);
                    badge.innerText = `FALTAM ${horasRestantes}H PARA A CHEGADA`;
                }
            }

        }, 2000);
    }

    function calcularPosicao(progresso) {
        if (!fullRoute || fullRoute.length === 0) return ORIGEM;

        const posReal = progresso * (fullRoute.length - 1);
        const idx = Math.floor(posReal);
        const t = posReal - idx;

        const p1 = fullRoute[idx];
        const p2 = fullRoute[idx + 1] || p1;

        const lat = p1[0] + (p2[0] - p1[0]) * t;
        const lng = p1[1] + (p2[1] - p1[1]) * t;

        return [lat, lng];
    }
});
