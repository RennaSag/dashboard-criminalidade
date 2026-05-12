// Chart.js defaults
Chart.defaults.color = '#4a5568';
Chart.defaults.font.family = "'Lato', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = '700';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.legend.labels.color = '#4a5568';

const GRID = { color: 'rgba(0,0,0,0.06)', drawBorder: false };

const CLUSTER_CORES = ['#1a56a0', '#c0392b', '#d4860a', '#1a7a40'];

const C = {
    danger: '#c0392b',
    warning: '#d4860a',
    accent: '#1a56a0',
    accent2: '#e05c1a',
    ok: '#1a7a40',
    teal: '#0e8a7a',
    muted: '#8a96a8',
};

// utilitarios
function colorByValue(val, min, max) {
    if (val === null || val === undefined || isNaN(val)) return '#e8ecf2';
    const pct = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));


    if (pct < 0.5) return lerpColor('#0a3d91', '#4db8ff', pct / 0.5);
    return lerpColor('#4db8ff', '#ff0000', (pct - 0.5) / 0.5);

}

function lerpColor(a, b, t) {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const r = Math.round((ah >> 16) + ((bh >> 16) - (ah >> 16)) * t);
    const g = Math.round(((ah >> 8) & 0xff) + (((bh >> 8) & 0xff) - ((ah >> 8) & 0xff)) * t);
    const bl = Math.round((ah & 0xff) + ((bh & 0xff) - (ah & 0xff)) * t);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
}

function fmtBRL(v) {
    if (!v || isNaN(v)) return 'N/D';
    if (v >= 1e9) return 'R$ ' + (v / 1e9).toFixed(1).replace('.', ',') + 'B';
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + 'M';
    return 'R$ ' + Number(v).toLocaleString('pt-BR');
}

function fmtNum(v) {
    if (v === null || v === undefined || isNaN(v)) return 'N/D';
    return Number(v).toFixed(1).replace('.', ',');
}

function getAno() {
    return document.getElementById('ano-selector')?.value || '2024';
}

function getIndicador() {
    return document.getElementById('indicador-selector')?.value || 'mvi';
}

// retorna o mapa { estado: valor } para um indicador + ano
function getMapaIndicador(ind, ano) {
    ano = ano || getAno();
    if (ind === 'trafico') return DATA[`trafico${ano}`] || DATA.trafico || {};
    if (ind === 'feminicidio') return DATA[`feminicidio${ano}`] || DATA.feminicidio || {};

    if (ind === 'rouboVeiculos') return DATA[`rouboVeiculos${ano}`] || DATA.rouboVeiculos || {};
    if (ind === 'rouboCelulares') return DATA[`rouboCelulares${ano}`] || DATA.rouboCelulares || {};

    const mviMaps = { '2022': DATA.mvi2022_map, '2023': DATA.mvi2023_map, '2024': DATA.mvi };
    return mviMaps[ano] || DATA.mvi || {};
}

// media dos valores não-nulos de um mapa
function mediaMapa(mapa) {
    const vals = Object.values(mapa).filter(v => v !== null && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// seletores globais
const anoSel = document.getElementById('ano-selector');
const indSel = document.getElementById('indicador-selector');
const anoDisplay = document.getElementById('ano-display');


// navegacao
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');

navItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const target = item.dataset.section;
        navItems.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        const sec = document.getElementById(target);
        if (sec) sec.classList.add('active');

        const topbarControls = document.querySelector('.topbar-controls');
        const indSelector = document.getElementById('indicador-selector');
        if (topbarControls) topbarControls.style.display = (target === 'tabela' || target === 'analise-ml' || target === 'clusters-taxa') ? 'none' : 'flex';
        if (indSelector) indSelector.style.display = (target === 'investimentos' || target === 'criminalidade') ? 'none' : '';

        if (target === 'mapa') setTimeout(initMapa, 80);
        if (target === 'criminalidade') renderCriminalidade();
        if (target === 'investimentos') renderInvestimentos();
        if (target === 'analise-ml') renderAnaliseMl();
        if (target === 'clusters-taxa') renderClustersTaxa();
        
    });
});

// listener unico para ano e indicador
function onFiltroChange() {
    if (anoDisplay) anoDisplay.textContent = getAno();
    renderVisaoGeral();
    if (mapaIniciado && geojsonCache) renderMapa(geojsonCache);
    if (document.getElementById('criminalidade')?.classList.contains('active')) renderCriminalidade();
    if (document.getElementById('investimentos')?.classList.contains('active')) renderInvestimentos();
}

if (anoSel) anoSel.addEventListener('change', onFiltroChange);
if (indSel) indSel.addEventListener('change', onFiltroChange);

// secao 1 - visao geral
let chartMviBar = null;
let chartGastosDn = null;

function renderVisaoGeral() {
    const ano = getAno();
    const ind = getIndicador();
    const estados = DATA.estados || [];

    // kpi: atualiza medias pelo ano selecionado
    const mviMedia = mediaMapa(getMapaIndicador('mvi', ano));
    const trafMedia = mediaMapa(getMapaIndicador('trafico', ano));
    const femMedia = mediaMapa(getMapaIndicador('feminicidio', ano));

    const kpiEls = [
        { sel: '.kpi-danger  .kpi-value', val: fmtNum(mviMedia) },
        { sel: '.kpi-warning .kpi-value', val: fmtNum(trafMedia) },
        { sel: '.kpi-alert   .kpi-value', val: fmtNum(femMedia) },
    ];
    kpiEls.forEach(({ sel, val }) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = val;
    });

    const kpiFills = document.querySelectorAll('.kpi-bar .kpi-fill');
    if (kpiFills[0]) kpiFills[0].style.width = Math.min(100, (mviMedia / 60) * 100) + '%';
    if (kpiFills[1]) kpiFills[1].style.width = Math.min(100, (trafMedia / 200) * 100) + '%';
    if (kpiFills[2]) kpiFills[2].style.width = Math.min(100, (femMedia / 10) * 100) + '%';

    // bar chart: indicador + ano selecionados
    const mapaAtual = getMapaIndicador(ind, ano);
    const pares = estados
        .map(e => ({ e, v: mapaAtual[e] ?? null }))
        .filter(p => p.v !== null && !isNaN(p.v))
        .sort((a, b) => b.v - a.v);

    const minV = pares.length ? Math.min(...pares.map(p => p.v)) : 0;
    const maxV = pares.length ? Math.max(...pares.map(p => p.v)) : 1;

    const ctxBar = document.getElementById('chart-mvi-bar');
    if (ctxBar) {
        if (chartMviBar) { chartMviBar.destroy(); chartMviBar = null; }
        chartMviBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: pares.map(p => p.e),
                datasets: [{
                    data: pares.map(p => p.v),
                    backgroundColor: pares.map(p => colorByValue(p.v, minV, maxV)),
                    borderColor: pares.map(p => colorByValue(p.v, minV, maxV)),
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: 'Números Absolutos', color: '#8a96a8' } }
                },
                animation: { duration: 600 },
            }
        });
    }

    // atualiza label do gráfico de barras
    const indLabels = { mvi: 'MVI', trafico: 'Tráfico de Drogas', feminicidio: 'Feminicídio', rouboVeiculos: 'Roubo/Furto Veículos', rouboCelulares: 'Roubo/Furto Celulares' };
    const labelEl = document.querySelector('.mini-charts-row .chart-label');
    if (labelEl) labelEl.textContent = `${indLabels[ind] || ind} por Estado - ${ano}`;

    // donut gastos estatico
    if (!chartGastosDn) {
        const gastos = DATA.gastosCategorias || {};
        const ctxDonut = document.getElementById('chart-gastos-donut');
        if (ctxDonut && Object.keys(gastos).length) {
            chartGastosDn = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(gastos),
                    datasets: [{
                        data: Object.values(gastos),
                        backgroundColor: [C.accent + 'cc', C.ok + 'cc', C.warning + 'cc', C.teal + 'cc'],
                        borderColor: ['#fff', '#fff', '#fff', '#fff'],
                        borderWidth: 3,
                        hoverOffset: 8,
                    }]
                },
                options: {
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#4a5568', font: { size: 11 }, padding: 12 } },
                        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: R$ ${(ctx.raw / 1e9).toFixed(1).replace('.', ',')}B` } }
                    },
                    animation: { animateRotate: true, duration: 1000 },
                }
            });
        }
    }
}

// renderiza na carga inicial
renderVisaoGeral();


// secao 2 mapa
let mapaIniciado = false;
let mapaLeaflet = null;
let geojsonLayer = null;
let geojsonCache = null;

const NOME_PARA_SIGLA = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
    'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
    'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
    'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
    'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
    'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};
const SIGLA_PARA_NOME = Object.fromEntries(Object.entries(NOME_PARA_SIGLA).map(([k, v]) => [v, k]));

function extrairSigla(props) {
    const candidatos = [props.sigla, props.uf, props.UF, props.id, props.SIGLA, props.codigo_uf];
    for (const c of candidatos) { if (c && c.length === 2) return c.toUpperCase(); }
    const nome = props.name || props.nome || props.NAME || '';
    return NOME_PARA_SIGLA[nome] || NOME_PARA_SIGLA[nome.trim()] || null;
}

function normStr(s) {
    if (!s) return '';
    return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extrairNomeGeoJSON(props) {
    return props.name || props.nome || props.NAME || props.NOME || '';
}

function initMapa() {
    if (mapaIniciado) return;
    mapaIniciado = true;
    mapaLeaflet = L.map('mapa-brasil', {
        zoomControl: true, scrollWheelZoom: false, attributionControl: false,
    }).setView([-14.2350, -51.9253], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 8, attribution: '© OpenStreetMap'
    }).addTo(mapaLeaflet);
    carregarGeoJSON();
}

function carregarGeoJSON() {
    const url = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';
    fetch(url)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(geojson => { geojsonCache = geojson; renderMapa(geojson); })
        .catch(() => {
            fetch('https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/data/Brasil.json')
                .then(r => r.json())
                .then(geojson => { geojsonCache = geojson; renderMapa(geojson); })
                .catch(() => {
                    document.getElementById('mapa-brasil').innerHTML =
                        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8a96a8;font-size:14px;text-align:center;padding:20px;">⚠ Não foi possível carregar o mapa.</div>';
                });
        });
}

function renderMapa(geojson) {
    const ind = getIndicador();
    const ano = getAno();
    const dadosBrutos = getMapaIndicador(ind, ano);

    const dadosNorm = {};
    for (const [k, v] of Object.entries(dadosBrutos)) {
        dadosNorm[normStr(k)] = v;
        const sigla = NOME_PARA_SIGLA[k.trim()];
        if (sigla) dadosNorm[normStr(sigla)] = v;
    }

    function buscarValor(props) {
        const nomeGeo = extrairNomeGeoJSON(props);
        const siglaGeo = extrairSigla(props) || '';
        let val = dadosNorm[normStr(nomeGeo)];
        if (val !== undefined) return val;
        val = dadosNorm[normStr(siglaGeo)];
        if (val !== undefined) return val;
        const siglaMapeada = NOME_PARA_SIGLA[nomeGeo] || NOME_PARA_SIGLA[nomeGeo.trim()];
        if (siglaMapeada) { val = dadosNorm[normStr(siglaMapeada)]; if (val !== undefined) return val; }
        return null;
    }

    const valores = Object.values(dadosBrutos).filter(v => v !== null && !isNaN(v));
    const min = valores.length ? Math.min(...valores) : 0;
    const max = valores.length ? Math.max(...valores) : 1;

    if (geojsonLayer) { mapaLeaflet.removeLayer(geojsonLayer); geojsonLayer = null; }

    geojsonLayer = L.geoJSON(geojson, {
        style: feature => ({
            fillColor: colorByValue(buscarValor(feature.properties), min, max),
            fillOpacity: 0.78,
            color: '#ffffff',
            weight: 1.5,
        }),
        onEachFeature: (feature, layer) => {
            const nomeGeo = extrairNomeGeoJSON(feature.properties);
            const sigla = extrairSigla(feature.properties) || '';
            const nome = nomeGeo || SIGLA_PARA_NOME[sigla] || sigla || '-';
            const val = buscarValor(feature.properties);

            layer.on({
                mouseover: e => {
                    e.target.setStyle({ weight: 3, fillOpacity: 0.95, color: '#1a56a0' });
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                    atualizarInfoBox(sigla, nome, val, ind, min, max);
                },
                mouseout: e => {
                    geojsonLayer.resetStyle(e.target);
                    document.getElementById('map-estado-info').innerHTML = '<div class="info-hint">↖ Passe o cursor sobre um estado</div>';
                },
                click: e => mapaLeaflet.fitBounds(e.target.getBounds(), { padding: [30, 30] })
            });

            layer.bindTooltip(
                val !== null ? `<strong>${nome}</strong>: ${fmtNum(val)}` : `<strong>${nome}</strong>: sem dados`,
                { sticky: true, direction: 'top' }
            );
        }
    }).addTo(mapaLeaflet);

    // top 5
    const pares = Object.entries(dadosBrutos)
        .filter(([, v]) => v !== null && !isNaN(v))
        .map(([k, v]) => ({ nome: k, val: v }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5);

    const rankEl = document.getElementById('ranking-list');
    if (rankEl) {
        rankEl.innerHTML = pares.map((p, i) => `
            <div class="ranking-item">
                <span class="rank-num">${i + 1}</span>
                <span class="rank-estado">${p.nome}</span>
                <span class="rank-val">${fmtNum(p.val)}</span>
            </div>
        `).join('');
    }
}

function atualizarInfoBox(sigla, nome, val, ind, min, max) {
    const ano = getAno();
    const labels = { mvi: 'MVI', trafico: 'Tráfico', feminicidio: 'Feminicídio', rouboVeiculos: 'Roubo de Veículos', rouboCelulares: 'Roubo de Celulares' };

    function getInvest(chave) {
        const m = DATA[`${chave}${ano}`] || DATA[chave] || {};
        return m[nome] ?? m[sigla] ?? null;
    }

    const box = document.getElementById('map-estado-info');
    if (!box) return;
    box.innerHTML = `
        <div class="nome">${nome}</div>
        <div class="metric">
            <span class="metric-label">${labels[ind] || ind}</span>
            <span class="metric-val danger">${fmtNum(val)}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Menor índice</span>
            <span class="metric-val invest">${fmtNum(min)}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Maior índice</span>
            <span class="metric-val danger">${fmtNum(max)}</span>
        </div>
        <hr style="border:none;border-top:2px solid var(--border);margin:6px 0;">
        <div class="metric">
            <span class="metric-label">Policiamento</span>
            <span class="metric-val invest">${fmtBRL(getInvest('policiamento'))}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Defesa Civil</span>
            <span class="metric-val invest">${fmtBRL(getInvest('defesaCivil'))}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Inteligência</span>
            <span class="metric-val invest">${fmtBRL(getInvest('inteligencia'))}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Demais Serviços</span>
            <span class="metric-val invest">${fmtBRL(getInvest('demaisServicos'))}</span>
        </div>
    `;
}


// secao 3 criminalidade
let chartMviLine = null;
let chartScatter = null;
let chartRouboBar = null;

function renderCriminalidade() {
    const ano = getAno();
    const estados = DATA.estados || [];

    // line mvi serie historica - usa mapas por estado (igual trafico/feminicidio)
    const mviMapa2022 = DATA.mvi2022_map || {};
    const mviMapa2023 = DATA.mvi2023_map || {};
    const mviMapa2024 = DATA.mvi || {};

    // pega todos os estados que têm dado em pelo menos um ano
    const todosEstadosMvi = estados.filter(e =>
        mviMapa2022[e] != null || mviMapa2023[e] != null || mviMapa2024[e] != null
    ).sort((a, b) => (mviMapa2024[b] ?? mviMapa2023[b] ?? 0) - (mviMapa2024[a] ?? mviMapa2023[a] ?? 0));

    const ctxLine = document.getElementById('chart-mvi-line');
    if (ctxLine) {
        if (chartMviLine) { chartMviLine.destroy(); chartMviLine = null; }
        chartMviLine = new Chart(ctxLine, {
            type: 'bar',
            data: {
                labels: todosEstadosMvi,
                datasets: [
                    {
                        label: '2022',
                        data: todosEstadosMvi.map(e => mviMapa2022[e] ?? null),
                        backgroundColor: C.accent + 'bb', borderColor: C.accent, borderWidth: 1, borderRadius: 3,
                    },
                    {
                        label: '2023',
                        data: todosEstadosMvi.map(e => mviMapa2023[e] ?? null),
                        backgroundColor: C.warning + 'bb', borderColor: C.warning, borderWidth: 1, borderRadius: 3,
                    },
                    {
                        label: '2024',
                        data: todosEstadosMvi.map(e => mviMapa2024[e] ?? null),
                        backgroundColor: C.danger + 'bb', borderColor: C.danger, borderWidth: 1, borderRadius: 3,
                    },
                ]
            },
            options: {
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: 'Número Absoluto de Casos', color: '#8a96a8' } }
                },
                animation: { duration: 700 },
            }
        });
    }


    // barra trafico por estado
    const trafMapa = getMapaIndicador('trafico', ano);
    const paresTrafico = estados
        .map(e => ({ e, v: trafMapa[e] ?? null }))
        .filter(p => p.v !== null && !isNaN(p.v))
        .sort((a, b) => b.v - a.v);

    const ctxTrafico = document.getElementById('chart-trafico-bar');
    if (ctxTrafico) {
        if (chartScatter) { chartScatter.destroy(); chartScatter = null; }
        const minT = Math.min(...paresTrafico.map(p => p.v));
        const maxT = Math.max(...paresTrafico.map(p => p.v));
        chartScatter = new Chart(ctxTrafico, {
            type: 'bar',
            data: {
                labels: paresTrafico.map(p => p.e),
                datasets: [{
                    data: paresTrafico.map(p => p.v),
                    backgroundColor: paresTrafico.map(p => colorByValue(p.v, minT, maxT) + 'cc'),
                    borderColor: paresTrafico.map(p => colorByValue(p.v, minT, maxT)),
                    borderWidth: 1, borderRadius: 4,
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: `Número Absoluto de Casos`, color: '#8a96a8' } }
                },
                animation: { duration: 700 },
            }
        });
    }

    // barra feminicidio por estado
    const femMapa = getMapaIndicador('feminicidio', ano);
    const paresFem = estados
        .map(e => ({ e, v: femMapa[e] ?? null }))
        .filter(p => p.v !== null && !isNaN(p.v))
        .sort((a, b) => b.v - a.v);

    const ctxFem = document.getElementById('chart-feminicidio-bar');
    if (ctxFem) {
        if (chartRouboBar) { chartRouboBar.destroy(); chartRouboBar = null; }
        const minF = Math.min(...paresFem.map(p => p.v));
        const maxF = Math.max(...paresFem.map(p => p.v));
        chartRouboBar = new Chart(ctxFem, {
            type: 'bar',
            data: {
                labels: paresFem.map(p => p.e),
                datasets: [{
                    data: paresFem.map(p => p.v),
                    backgroundColor: paresFem.map(p => colorByValue(p.v, minF, maxF) + 'cc'),
                    borderColor: paresFem.map(p => colorByValue(p.v, minF, maxF)),
                    borderWidth: 1, borderRadius: 4,
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: `Números Absolutos de Casos`, color: '#8a96a8' } }
                },
                animation: { duration: 700 },
            }
        });
    }

    // barra roubo veiculos + celulares
    const veicMap = DATA.rouboVeiculos || {};
    const celMap = DATA.rouboCelulares || {};
    const estFilt = estados.filter(e => veicMap[e] != null && celMap[e] != null && !isNaN(veicMap[e]) && !isNaN(celMap[e]));

    const ctxRoubo = document.getElementById('chart-roubo-bar');
    if (ctxRoubo) {
        if (chartMviBar) { chartMviBar.destroy(); chartMviBar = null; }
        chartMviBar = new Chart(ctxRoubo, {
            type: 'bar',
            data: {
                labels: estFilt,
                datasets: [
                    {
                        label: 'Roubo/Furto Veículos (nº absoluto)',
                        data: estFilt.map(e => veicMap[e]),
                        backgroundColor: C.accent + 'bb', borderColor: C.accent, borderWidth: 1, borderRadius: 3,
                    },
                    {
                        label: 'Roubo/Furto Celulares (nº absoluto)',
                        data: estFilt.map(e => celMap[e]),
                        backgroundColor: C.teal + 'bb', borderColor: C.teal, borderWidth: 1, borderRadius: 3,
                    },
                ]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rect',
                            padding: 20,
                            font: { size: 12, weight: '700' },
                            color: '#4a5568',
                        }
                    }
                },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 45, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: 'Número Absoluto de Casos', color: '#8a96a8' } }
                },
                animation: { duration: 600 },
            }
        });
    }

    // atualiza titulos com ano
    const lblTrafico = document.querySelector('#criminalidade .charts-2col .chart-card:nth-child(2) .chart-label');
    if (lblTrafico) lblTrafico.textContent = `Tráfico de Drogas por Estado (${ano})`;
    const lblFem = document.querySelector('#criminalidade .chart-card.full-width:nth-child(1) .chart-label');
    if (lblFem) lblFem.textContent = `Feminicídio por Estado (${ano})`;
}




// secao 4 investimentos
let chartPolBar = null;
let chartDefBar = null;
let chartIntBar = null;
let chartDemBar = null;
let chartCorr = null;

function renderInvestimentos() {
    const ano = getAno();
    const estados = DATA.estados || [];

    // gastos, pega por ano se existir, senão usa 2024 como fallback
    function getMapa(chave) {
        return DATA[`${chave}${ano}`] || DATA[chave] || {};
    }

    const polMap = getMapa('policiamento');
    const defMap = getMapa('defesaCivil');
    const intMap = getMapa('inteligencia');
    const demMap = getMapa('demaisServicos');
    const mviMap = getMapaIndicador('mvi', ano);

    // ordena estados por policiamento decrescente
    const labelsOrd = estados
        .filter(e => polMap[e] != null && !isNaN(polMap[e]))
        .sort((a, b) => (polMap[b] ?? 0) - (polMap[a] ?? 0));

    // helper cria bar horizontal
    function makeBarH(canvasId, chartRef, dadosMapa, label, cor) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return chartRef;
        if (chartRef) { chartRef.destroy(); }
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsOrd,
                datasets: [{
                    label,
                    data: labelsOrd.map(e => dadosMapa[e] ?? null),
                    backgroundColor: cor + 'bb',
                    borderColor: cor,
                    borderWidth: 1,
                    borderRadius: 3,
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: GRID,
                        ticks: { callback: v => v >= 1e9 ? (v / 1e9).toFixed(1).replace('.', ',') + 'B' : v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v }
                    },
                    y: { grid: GRID, ticks: { font: { size: 11 } } }
                },
                animation: { duration: 700 },
            }
        });
    }

    chartPolBar = makeBarH('chart-policiamento', chartPolBar, polMap, 'Policiamento (R$)', C.accent);
    chartDefBar = makeBarH('chart-defesa', chartDefBar, defMap, 'Defesa Civil (R$)', C.ok);
    chartIntBar = makeBarH('chart-inteligencia', chartIntBar, intMap, 'Informações e Inteligência (R$)', C.teal);
    chartDemBar = makeBarH('chart-demais', chartDemBar, demMap, 'Demais Serviços (R$)', C.warning);

    // scatter policiamento x MVI
    const ctxCorr = document.getElementById('chart-correlacao');
    if (ctxCorr) {
        if (chartCorr) { chartCorr.destroy(); chartCorr = null; }
        const scatterData = estados.map(e => {
            const x = polMap[e]; const y = mviMap[e];
            if (!x || !y || isNaN(x) || isNaN(y)) return null;
            return { x, y, label: e };
        }).filter(Boolean);

        chartCorr = new Chart(ctxCorr, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Estados',
                    data: scatterData,
                    backgroundColor: C.ok + 'bb',
                    borderColor: C.ok,
                    pointRadius: 7, pointHoverRadius: 10,
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.raw.label} - Policiamento: ${fmtBRL(ctx.raw.x)} | MVI: ${fmtNum(ctx.raw.y)}` } }
                },
                scales: {
                    x: {
                        grid: GRID,
                        title: { display: true, text: `Policiamento (R$) - ${ano}`, color: '#8a96a8' },
                        ticks: { callback: v => (v / 1e9).toFixed(1).replace('.', ',') + 'B' }
                    },
                    y: {
                        grid: GRID,
                        title: { display: true, text: `MVI (por 100 mil hab.) - ${ano}`, color: '#8a96a8' }
                    }
                },
                animation: { duration: 700 },
            }
        });
    }
}

// secao 5 tabela
const tabelaSelect = document.getElementById('tabela-select');
const buscaInput = document.getElementById('busca-estado');
const tabelaBody = document.getElementById('tabela-body');
const fonteTexto = document.getElementById('fonte-texto');

let ultimosRows = [];

function carregarTabela(tabela) {
    fetch(`api/tabela_dados.php?tabela=${encodeURIComponent(tabela)}`)
        .then(r => r.json())
        .then(json => {
            if (!json.rows || !json.rows.length) {
                tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8a96a8;padding:24px;">Sem dados disponíveis</td></tr>';
                return;
            }
            ultimosRows = json.rows;
            filtrarTabela();
            if (fonteTexto) fonteTexto.innerHTML = FONTES[tabela] || '';
        })
        .catch(() => {
            tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c0392b;padding:24px;">Erro ao carregar dados.</td></tr>';
        });
}

function filtrarTabela() {
    const query = buscaInput ? buscaInput.value.toLowerCase().trim() : '';
    const filtered = query ? ultimosRows.filter(r => r.estado.toLowerCase().includes(query)) : ultimosRows;
    tabelaBody.innerHTML = filtered.map(r => `
        <tr>
            <td class="estado-cell">${r.estado}</td>
            <td>${r.ano2022 || '-'}</td>
            <td>${r.ano2023 || '-'}</td>
            <td>${r.ano2024 || '-'}</td>
        </tr>
    `).join('');
}

if (tabelaSelect) tabelaSelect.addEventListener('change', () => carregarTabela(tabelaSelect.value));
if (buscaInput) buscaInput.addEventListener('input', filtrarTabela);
if (tabelaSelect) carregarTabela(tabelaSelect.value);  // ← adicionar esta linha



document.addEventListener('click', function(e) {
    const tab = e.target.closest('.ml-tab');
    if (!tab) return;
    const tabId = tab.dataset.tab;

    document.querySelectorAll('.ml-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.ml-painel').forEach(p => p.style.display = 'none');
    const painel = document.getElementById(`ml-painel-${tabId}`);
    if (painel) painel.style.display = 'block';
});

// ── Gráficos ML (instâncias globais para destroy) ────────────────────────────
let chartPrevisaoLinha   = null;
let chartPrevisaoBar     = null;
let chartCorrelacaoBar   = null;
let chartCorrelacaoSc    = null;
let chartEficienciaBar   = null;
let chartVariacaoMvi     = null;

// ── Cores utilitárias ─────────────────────────────────────────────────────────
function corTendencia(t) { return t === 'queda' ? C.ok : C.danger; }
function corVariacao(v)  { return v <= 0 ? C.ok : C.danger; }

// ── Carrega e renderiza toda a seção ML ──────────────────────────────────────
function renderAnaliseMl() {
    Promise.all([
        fetch('api/ml_dados.php?tipo=previsao').then(r => r.json()),
        fetch('api/ml_dados.php?tipo=correlacao').then(r => r.json()),
        fetch('api/ml_dados.php?tipo=eficiencia').then(r => r.json()),
    ]).then(([prev, corr, efic]) => {
        const prevRows  = prev.rows  || [];
        const corrRows  = corr.rows  || [];
        const eficRows  = efic.rows  || [];

        if (!prevRows.length) {
            ['previsao-tabela-body','correlacao-tabela-body','eficiencia-tabela-body'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8a96a8;padding:24px;">Sem dados. Execute analisar_ml.py primeiro.</td></tr>';
            });
            return;
        }

        renderMlKpis(prevRows, corrRows, eficRows);
        renderPrevisao(prevRows);
        renderCorrelacao(corrRows);
        renderEficiencia(eficRows);
    }).catch(() => {
        ['previsao-tabela-body','correlacao-tabela-body','eficiencia-tabela-body'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:24px;">Erro ao carregar. Execute analisar_ml.py e verifique ml_dados.php.</td></tr>';
        });
    });
}

// ── KPI cards do topo ─────────────────────────────────────────────────────────
function renderMlKpis(prevRows, corrRows, eficRows) {
    const grid = document.getElementById('ml-kpi-grid');
    if (!grid) return;

    const emQueda   = prevRows.filter(r => r.tendencia === 'queda').length;
    const emAlta    = prevRows.filter(r => r.tendencia === 'alta').length;
    const corrNeg   = corrRows.filter(r => r.pearson_r < 0).length;
    const melhor    = eficRows[0];
    const pior      = eficRows[eficRows.length - 1];

    grid.innerHTML = `
        <div class="kpi-card kpi-invest">
            <div class="kpi-label">Estados em Queda (MVI)</div>
            <div class="kpi-value" style="color:var(--ok)">${emQueda}</div>
            <div class="kpi-unit">tendência decrescente 2022→2026</div>
            <div class="kpi-bar"><div class="kpi-fill" style="width:${(emQueda/27)*100}%;background:var(--ok)"></div></div>
        </div>
        <div class="kpi-card kpi-danger">
            <div class="kpi-label">Estados em Alta (MVI)</div>
            <div class="kpi-value">${emAlta}</div>
            <div class="kpi-unit">tendência crescente 2022→2026</div>
            <div class="kpi-bar"><div class="kpi-fill" style="width:${(emAlta/27)*100}%"></div></div>
        </div>
        <div class="kpi-card kpi-warning">
            <div class="kpi-label">Correlação Inversa</div>
            <div class="kpi-value" style="color:var(--ok)">${corrNeg}</div>
            <div class="kpi-unit">estados onde + invest. → - crime</div>
            <div class="kpi-bar"><div class="kpi-fill" style="width:${(corrNeg/27)*100}%;background:var(--ok)"></div></div>
        </div>
        <div class="kpi-card kpi-invest">
            <div class="kpi-label">Mais Eficiente</div>
            <div class="kpi-value" style="font-size:20px;color:var(--ok)">${melhor?.estado ?? '—'}</div>
            <div class="kpi-unit">score = ${fmtNum(melhor?.score_eficiencia)} | ΔMVI = ${fmtNum(melhor?.variacao_mvi)}</div>
            <div class="kpi-bar"><div class="kpi-fill" style="width:80%;background:var(--ok)"></div></div>
        </div>
    `;
}

// ── Previsão de MVI ───────────────────────────────────────────────────────────
function renderPrevisao(rows) {
    // select de estado
    const sel = document.getElementById('previsao-estado-select');
    if (sel) {
        sel.innerHTML = rows.map(r => `<option value="${r.estado}">${r.estado}</option>`).join('');
        sel.addEventListener('change', () => renderLinhaEstado(rows, sel.value));
        renderLinhaEstado(rows, rows[0].estado);
    }

    // bar: previsão 2025 vs 2026
    const sorted = [...rows].sort((a, b) => b.prev_2025 - a.prev_2025);
    const ctxBar = document.getElementById('chart-previsao-bar');
    if (ctxBar) {
        if (chartPrevisaoBar) { chartPrevisaoBar.destroy(); chartPrevisaoBar = null; }
        chartPrevisaoBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: sorted.map(r => r.estado),
                datasets: [
                    {
                        label: 'Previsão 2025',
                        data: sorted.map(r => r.prev_2025),
                        backgroundColor: C.warning + 'bb', borderColor: C.warning,
                        borderWidth: 1, borderRadius: 3,
                    },
                    {
                        label: 'Previsão 2026',
                        data: sorted.map(r => r.prev_2026),
                        backgroundColor: C.accent2 + 'bb', borderColor: C.accent2,
                        borderWidth: 1, borderRadius: 3,
                    },
                ]
            },
            options: {
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: 'MVI (taxa/100mil hab.)', color: '#8a96a8' } }
                },
            }
        });
    }

    // tabela
    const tbody = document.getElementById('previsao-tabela-body');
    if (tbody) {
        tbody.innerHTML = rows.map(r => {
            const cor = corTendencia(r.tendencia);
            const badge = `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:900;background:${cor}22;color:${cor};border:1px solid ${cor}55;">${r.tendencia === 'queda' ? '↘ Queda' : '↗ Alta'}</span>`;
            return `<tr>
                <td class="estado-cell">${r.estado}</td>
                <td>${fmtNum(r.mvi_2022)}</td>
                <td>${fmtNum(r.mvi_2023)}</td>
                <td>${fmtNum(r.mvi_2024)}</td>
                <td style="font-weight:900;color:${C.warning}">${fmtNum(r.prev_2025)}</td>
                <td style="font-weight:900;color:${C.accent2}">${fmtNum(r.prev_2026)}</td>
                <td>${badge}</td>
                <td style="color:var(--text-muted);font-size:13px">${r.r2 !== null ? r.r2.toFixed(4) : 'N/A'}</td>
            </tr>`;
        }).join('');
    }
}

function renderLinhaEstado(rows, estado) {
    const r = rows.find(x => x.estado === estado);
    if (!r) return;

    const ctx = document.getElementById('chart-previsao-linha');
    if (!ctx) return;
    if (chartPrevisaoLinha) { chartPrevisaoLinha.destroy(); chartPrevisaoLinha = null; }

    const anos     = [2022, 2023, 2024, 2025, 2026];
    const historico = [r.mvi_2022, r.mvi_2023, r.mvi_2024, null, null];
    const projecao  = [null, null, r.mvi_2024, r.prev_2025, r.prev_2026];

    chartPrevisaoLinha = new Chart(ctx, {
        type: 'line',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Histórico',
                    data: historico,
                    borderColor: C.accent,
                    backgroundColor: C.accent + '22',
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: C.accent,
                    tension: 0.3,
                    fill: true,
                    spanGaps: false,
                },
                {
                    label: 'Projeção (Regressão Linear)',
                    data: projecao,
                    borderColor: C.warning,
                    backgroundColor: C.warning + '15',
                    borderWidth: 2.5,
                    borderDash: [6, 4],
                    pointRadius: 5,
                    pointBackgroundColor: C.warning,
                    tension: 0.3,
                    fill: true,
                    spanGaps: false,
                },
            ]
        },
        options: {
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: `${estado} — Taxa de MVI por 100 mil hab.`, color: '#4a5568', font: { size: 13, weight: '700' } }
            },
            scales: {
                x: { grid: GRID },
                y: { grid: GRID, beginAtZero: true, title: { display: true, text: 'Taxa MVI / 100 mil hab.', color: '#8a96a8' } }
            },
        }
    });
}


function renderCorrelacao(rows) {
    // bar horizontal: r por estado
    const ctxBar = document.getElementById('chart-correlacao-bar');
    if (ctxBar) {
        if (chartCorrelacaoBar) { chartCorrelacaoBar.destroy(); chartCorrelacaoBar = null; }
        chartCorrelacaoBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: rows.map(r => r.estado),
                datasets: [{
                    label: 'Pearson r',
                    data: rows.map(r => r.pearson_r),
                    backgroundColor: rows.map(r => (r.pearson_r < 0 ? C.ok : C.danger) + 'cc'),
                    borderColor:     rows.map(r => r.pearson_r < 0 ? C.ok : C.danger),
                    borderWidth: 1, borderRadius: 3,
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: GRID, min: -1, max: 1, title: { display: true, text: 'Coeficiente r de Pearson', color: '#8a96a8' } },
                    y: { grid: GRID, ticks: { font: { size: 10 } } }
                },
            }
        });
    }

    // scatter: invest_medio x mvi_medio
    const ctxSc = document.getElementById('chart-correlacao-scatter');
    if (ctxSc) {
        if (chartCorrelacaoSc) { chartCorrelacaoSc.destroy(); chartCorrelacaoSc = null; }
        chartCorrelacaoSc = new Chart(ctxSc, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Estados',
                    data: rows.map(r => ({ x: r.invest_medio, y: r.mvi_medio, label: r.estado, r: r.pearson_r })),
                    backgroundColor: rows.map(r => (r.pearson_r < 0 ? C.ok : C.danger) + 'bb'),
                    borderColor:     rows.map(r => r.pearson_r < 0 ? C.ok : C.danger),
                    pointRadius: 7, pointHoverRadius: 10,
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.raw.label} — Invest.: ${fmtBRL(ctx.raw.x)} | MVI: ${fmtNum(ctx.raw.y)} | r=${ctx.raw.r?.toFixed(2)}` } }
                },
                scales: {
                    x: { grid: GRID, title: { display: true, text: 'Investimento Total Médio (R$)', color: '#8a96a8' }, ticks: { callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : (v/1e6).toFixed(0)+'M' } },
                    y: { grid: GRID, title: { display: true, text: 'MVI Médio (taxa/100mil)', color: '#8a96a8' } }
                },
            }
        });
    }

    // tabela
    const tbody = document.getElementById('correlacao-tabela-body');
    if (tbody) {
        tbody.innerHTML = rows.map(r => {
            const cor = r.pearson_r < 0 ? C.ok : C.danger;
            const sig = r.p_value !== null ? (r.p_value < 0.05 ? '✓ sig.' : 'não sig.') : 'N/A';
            return `<tr>
                <td class="estado-cell">${r.estado}</td>
                <td style="font-weight:900;color:${cor}">${r.pearson_r >= 0 ? '+' : ''}${r.pearson_r.toFixed(4)}</td>
                <td style="color:var(--text-muted);font-size:13px">${r.p_value !== null ? r.p_value.toFixed(4) + ' ' + sig : 'N/A'}</td>
                <td>${r.forca}</td>
                <td>${r.direcao}</td>
                <td>${fmtBRL(r.invest_medio)}</td>
                <td style="color:var(--danger);font-weight:700">${fmtNum(r.mvi_medio)}</td>
            </tr>`;
        }).join('');
    }
}

// ── Eficiência de Investimento ────────────────────────────────────────────────
function renderEficiencia(rows) {
    // bar: score eficiencia
    const ctxEfic = document.getElementById('chart-eficiencia-bar');
    if (ctxEfic) {
        if (chartEficienciaBar) { chartEficienciaBar.destroy(); chartEficienciaBar = null; }
        chartEficienciaBar = new Chart(ctxEfic, {
            type: 'bar',
            data: {
                labels: rows.map(r => r.estado),
                datasets: [{
                    label: 'Score de Eficiência',
                    data: rows.map(r => r.score_eficiencia),
                    backgroundColor: rows.map(r => (r.score_eficiencia >= 0 ? C.ok : C.danger) + 'cc'),
                    borderColor:     rows.map(r => r.score_eficiencia >= 0 ? C.ok : C.danger),
                    borderWidth: 1, borderRadius: 3,
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Score: ${ctx.raw?.toFixed(2)}` } } },
                scales: {
                    x: { grid: GRID, title: { display: true, text: 'Redução de MVI por R$ 1 bilhão', color: '#8a96a8' } },
                    y: { grid: GRID, ticks: { font: { size: 10 } } }
                },
            }
        });
    }

    // bar: variação % MVI
    const sorted = [...rows].sort((a, b) => a.variacao_pct - b.variacao_pct);
    const ctxVar = document.getElementById('chart-variacao-mvi');
    if (ctxVar) {
        if (chartVariacaoMvi) { chartVariacaoMvi.destroy(); chartVariacaoMvi = null; }
        chartVariacaoMvi = new Chart(ctxVar, {
            type: 'bar',
            data: {
                labels: sorted.map(r => r.estado),
                datasets: [{
                    label: 'Variação % MVI (2022→2024)',
                    data: sorted.map(r => r.variacao_pct),
                    backgroundColor: sorted.map(r => (r.variacao_pct <= 0 ? C.ok : C.danger) + 'cc'),
                    borderColor:     sorted.map(r => r.variacao_pct <= 0 ? C.ok : C.danger),
                    borderWidth: 1, borderRadius: 3,
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw >= 0 ? '+' : ''}${ctx.raw?.toFixed(1)}%` } } },
                scales: {
                    x: { grid: GRID, title: { display: true, text: 'Variação % da Taxa de MVI', color: '#8a96a8' } },
                    y: { grid: GRID, ticks: { font: { size: 10 } } }
                },
            }
        });
    }

    // tabela
    const tbody = document.getElementById('eficiencia-tabela-body');
    if (tbody) {
        tbody.innerHTML = rows.map(r => {
            const corVar  = corVariacao(r.variacao_mvi);
            const corScor = r.score_eficiencia >= 0 ? C.ok : C.danger;
            return `<tr>
                <td style="font-weight:900;color:var(--text-muted);text-align:center">${r.ranking}</td>
                <td class="estado-cell">${r.estado}</td>
                <td>${fmtNum(r.mvi_2022)}</td>
                <td>${fmtNum(r.mvi_2024)}</td>
                <td style="font-weight:900;color:${corVar}">${r.variacao_mvi >= 0 ? '+' : ''}${fmtNum(r.variacao_mvi)}</td>
                <td style="font-weight:900;color:${corVar}">${r.variacao_pct >= 0 ? '+' : ''}${r.variacao_pct.toFixed(1)}%</td>
                <td>R$ ${r.invest_medio_bi.toFixed(3)} B</td>
                <td style="font-weight:900;color:${corScor}">${r.score_eficiencia >= 0 ? '+' : ''}${r.score_eficiencia.toFixed(2)}</td>
            </tr>`;
        }).join('');
    }
}

// secao clusters TAXA
let chartClusterTaxaBar = null;
let chartClusterTaxaScatter = null;
let chartClusterTaxaRadar = null;

function renderClustersTaxa() {
    fetch('api/clusters_taxa_dados.php')
        .then(r => r.json())
        .then(json => {
            const rows = json.rows || [];
            if (!rows.length) {
                document.getElementById('cluster-taxa-tabela-body').innerHTML =
                    '<tr><td colspan="5" style="text-align:center;color:#8a96a8;padding:24px;">Sem dados. Execute clusterizar_taxa.py primeiro.</td></tr>';
                return;
            }

            // tabela
            const tbody = document.getElementById('cluster-taxa-tabela-body');
            if (tbody) {
                tbody.innerHTML = rows.map(r => `
                    <tr>
                        <td class="estado-cell">${r.estado}</td>
                        <td><span style="
                            display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:900;
                            background:${CLUSTER_CORES[r.cluster_id] ?? '#8a96a8'}22;
                            color:${CLUSTER_CORES[r.cluster_id] ?? '#8a96a8'};
                            border:1px solid ${CLUSTER_CORES[r.cluster_id] ?? '#8a96a8'}55;
                        ">Cluster ${r.cluster_id}</span></td>
                        <td style="font-size:13px;color:var(--text-dim)">${r.perfil}</td>
                        <td style="font-family:var(--font-serif);font-weight:700;color:var(--danger)">${fmtNum(r.score_mvi)}</td>
                        <td style="font-family:var(--font-serif);font-weight:700;color:var(--invest)">${fmtBRL(r.score_investimento)}</td>
                    </tr>
                `).join('');
            }

            // KPI cards
            const kpiGrid = document.getElementById('cluster-taxa-kpi-grid');
            if (kpiGrid) {
                const kpiClasses = ['kpi-invest', 'kpi-danger', 'kpi-warning', 'kpi-alert'];
                kpiGrid.innerHTML = [0,1,2,3].map(id => {
                    const grupo = rows.filter(r => r.cluster_id === id);
                    const perfil = grupo[0]?.perfil ?? `Cluster ${id}`;
                    return `
                        <div class="kpi-card ${kpiClasses[id]}">
                            <div class="kpi-label">Cluster ${id}</div>
                            <div class="kpi-value" style="font-size:26px">${grupo.length}</div>
                            <div class="kpi-unit">estados</div>
                            <div class="kpi-unit" style="margin-top:6px;font-size:11px;font-weight:700;color:var(--text-dim)">${perfil}</div>
                            <div class="kpi-bar" style="margin-top:10px">
                                <div class="kpi-fill" style="width:${(grupo.length/27)*100}%"></div>
                            </div>
                        </div>`;
                }).join('');
            }

            // bar chart
            const ctxBar = document.getElementById('chart-cluster-taxa-bar');
            if (ctxBar) {
                if (chartClusterTaxaBar) { chartClusterTaxaBar.destroy(); chartClusterTaxaBar = null; }
                const contagem = [0,1,2,3].map(id => rows.filter(r => r.cluster_id === id).length);
                chartClusterTaxaBar = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: ['Cluster 0','Cluster 1','Cluster 2','Cluster 3'],
                        datasets: [{
                            label: 'Nº de Estados',
                            data: contagem,
                            backgroundColor: CLUSTER_CORES.map(c => c + 'cc'),
                            borderColor: CLUSTER_CORES,
                            borderWidth: 1, borderRadius: 6,
                        }]
                    },
                    options: {
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { afterLabel: ctx => rows.filter(r => r.cluster_id === ctx.dataIndex).map(r => r.estado).join(', ') } }
                        },
                        scales: {
                            x: { grid: GRID },
                            y: { grid: GRID, beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Quantidade de Estados', color: '#8a96a8' } }
                        },
                    }
                });
            }

            // scatter
            const ctxScatter = document.getElementById('chart-cluster-taxa-scatter');
            if (ctxScatter) {
                if (chartClusterTaxaScatter) { chartClusterTaxaScatter.destroy(); chartClusterTaxaScatter = null; }
                chartClusterTaxaScatter = new Chart(ctxScatter, {
                    type: 'scatter',
                    data: {
                        datasets: [0,1,2,3].map(id => ({
                            label: `Cluster ${id}`,
                            data: rows.filter(r => r.cluster_id === id).map(r => ({ x: r.score_investimento, y: r.score_mvi, label: r.estado })),
                            backgroundColor: CLUSTER_CORES[id] + 'bb',
                            borderColor: CLUSTER_CORES[id],
                            pointRadius: 8, pointHoverRadius: 11,
                        }))
                    },
                    options: {
                        plugins: {
                            legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '700' } } },
                            tooltip: { callbacks: { label: ctx => `${ctx.raw.label} — MVI: ${fmtNum(ctx.raw.y)} | Pol.: ${fmtBRL(ctx.raw.x)}` } }
                        },
                        scales: {
                            x: { grid: GRID, title: { display: true, text: 'Policiamento Médio (R$)', color: '#8a96a8' }, ticks: { callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(0)+'M' : v } },
                            y: { grid: GRID, title: { display: true, text: 'MVI Médio (por 100 mil hab.)', color: '#8a96a8' } }
                        },
                    }
                });
            }

            // radar
            const ctxRadar = document.getElementById('chart-cluster-taxa-radar');
            if (ctxRadar) {
                if (chartClusterTaxaRadar) { chartClusterTaxaRadar.destroy(); chartClusterTaxaRadar = null; }
                chartClusterTaxaRadar = new Chart(ctxRadar, {
                    type: 'radar',
                    data: {
                        labels: ['MVI (taxa)', 'Policiamento'],
                        datasets: [0,1,2,3].map(id => {
                            const grupo = rows.filter(r => r.cluster_id === id);
                            if (!grupo.length) return null;
                            const avgMvi = grupo.reduce((s,r) => s + r.score_mvi, 0) / grupo.length;
                            const avgInv = grupo.reduce((s,r) => s + r.score_investimento, 0) / grupo.length;
                            return {
                                label: `Cluster ${id}`,
                                data: [avgMvi, avgInv / 1e8],
                                backgroundColor: CLUSTER_CORES[id] + '33',
                                borderColor: CLUSTER_CORES[id],
                                borderWidth: 2,
                                pointBackgroundColor: CLUSTER_CORES[id],
                                pointRadius: 4,
                            };
                        }).filter(Boolean)
                    },
                    options: {
                        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { size: 11, weight: '700' } } } },
                        scales: { r: { grid: { color: 'rgba(0,0,0,0.07)' }, ticks: { display: false }, pointLabels: { font: { size: 12, weight: '700' }, color: '#4a5568' } } },
                    }
                });
            }
        })
        .catch(() => {
            const tbody = document.getElementById('cluster-taxa-tabela-body');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:24px;">Erro ao carregar. Execute clusterizar_taxa.py primeiro.</td></tr>';
        });
}