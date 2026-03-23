// Chart.js defaults
Chart.defaults.color = '#4a5568';
Chart.defaults.font.family = "'Lato', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = '700';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.legend.labels.color = '#4a5568';

const GRID = { color: 'rgba(0,0,0,0.06)', drawBorder: false };

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
    if (pct < 0.33) return lerpColor('#1a7a40', '#c8a800', pct / 0.33);
    if (pct < 0.66) return lerpColor('#c8a800', '#d4860a', (pct - 0.33) / 0.33);
    return lerpColor('#d4860a', '#c0392b', (pct - 0.66) / 0.34);
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
        if (topbarControls) topbarControls.style.display = (target === 'tabela') ? 'none' : 'flex';
        if (indSelector) indSelector.style.display = (target === 'investimentos' || target === 'criminalidade') ? 'none' : '';

        if (target === 'mapa') setTimeout(initMapa, 80);
        if (target === 'criminalidade') renderCriminalidade();
        if (target === 'investimentos') renderInvestimentos();
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
                    backgroundColor: pares.map(p => colorByValue(p.v, minV, maxV) + 'cc'),
                    borderColor: pares.map(p => colorByValue(p.v, minV, maxV)),
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 50, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true }
                },
                animation: { duration: 600 },
            }
        });
    }

    // atualiza label do gráfico de barras
    const indLabels = { mvi: 'MVI', trafico: 'Tráfico de Drogas', feminicidio: 'Feminicídio', rouboVeiculos: 'Roubo/Furto Veículos', rouboCelulares: 'Roubo/Furto Celulares' };
    const labelEl = document.querySelector('.mini-charts-row .chart-label');
    if (labelEl) labelEl.textContent = `${indLabels[ind] || ind} por Estado — ${ano}`;

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
            const nome = nomeGeo || SIGLA_PARA_NOME[sigla] || sigla || '—';
            const val = buscarValor(feature.properties);

            layer.on({
                mouseover: e => {
                    e.target.setStyle({ weight: 3, fillOpacity: 0.95, color: '#1a56a0' });
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                    atualizarInfoBox(sigla, nome, val, ind);
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

function atualizarInfoBox(sigla, nome, val, ind) {
    const labels = { mvi: 'MVI (por 100k hab.)', trafico: 'Tráfico (por 100k)', feminicidio: 'Feminicídio (por 100k mulheres)' };
    const polData = DATA.policiamento || {};
    const polVal = polData[nome] ?? polData[sigla] ?? null;
    const box = document.getElementById('map-estado-info');
    if (!box) return;
    box.innerHTML = `
        <div class="nome">${nome}</div>
        <div class="metric">
            <span class="metric-label">${labels[ind] || ind}</span>
            <span class="metric-val danger">${fmtNum(val)}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Policiamento</span>
            <span class="metric-val invest">${fmtBRL(polVal)}</span>
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

    const mviMapa = getMapaIndicador('mvi', ano);
    const pares = estados
        .map(e => ({ e, v: mviMapa[e] ?? null }))
        .filter(p => p.v !== null && !isNaN(p.v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 8);

    const topEstados = pares.map(p => p.e);
    const idxs = topEstados.map(e => estados.indexOf(e));

    // line mvi serie historica
    const ctxLine = document.getElementById('chart-mvi-line');
    if (ctxLine) {
        if (chartMviLine) { chartMviLine.destroy(); chartMviLine = null; }
        chartMviLine = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: topEstados,
                datasets: [
                    {
                        label: '2022',
                        data: idxs.map(i => (DATA.mvi2022 || [])[i] ?? null),
                        borderColor: C.accent, backgroundColor: C.accent + '18',
                        fill: false, tension: 0.4, pointRadius: 5, borderWidth: 2,
                    },
                    {
                        label: '2023',
                        data: idxs.map(i => (DATA.mvi2023 || [])[i] ?? null),
                        borderColor: C.warning, backgroundColor: C.warning + '18',
                        fill: false, tension: 0.4, pointRadius: 5, borderWidth: 2,
                    },
                    {
                        label: '2024',
                        data: idxs.map(i => (DATA.mvi2024 || [])[i] ?? null),
                        borderColor: C.danger, backgroundColor: C.danger + '18',
                        fill: true, tension: 0.4, pointRadius: 5, borderWidth: 2,
                    },
                ]
            },
            options: {
                plugins: { legend: { position: 'top' } },
                scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: false } },
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
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: `Taxa por 100k hab. — ${ano}`, color: '#8a96a8' } }
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
                    y: { grid: GRID, beginAtZero: true, title: { display: true, text: `Taxa por 100k mulheres — ${ano}`, color: '#8a96a8' } }
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
                        label: 'Roubo/Furto Veículos (por 100k veíc.)',
                        data: estFilt.map(e => veicMap[e]),
                        backgroundColor: C.accent + 'bb', borderColor: C.accent, borderWidth: 1, borderRadius: 3,
                    },
                    {
                        label: 'Roubo/Furto Celulares (por 100k hab.)',
                        data: estFilt.map(e => celMap[e]),
                        backgroundColor: C.teal + 'bb', borderColor: C.teal, borderWidth: 1, borderRadius: 3,
                    },
                ]
            },
            options: {
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { grid: GRID, ticks: { maxRotation: 45, font: { size: 10 } } },
                    y: { grid: GRID, beginAtZero: true }
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
                    tooltip: { callbacks: { label: ctx => `${ctx.raw.label} — Policiamento: ${fmtBRL(ctx.raw.x)} | MVI: ${fmtNum(ctx.raw.y)}` } }
                },
                scales: {
                    x: {
                        grid: GRID,
                        title: { display: true, text: `Policiamento (R$) — ${ano}`, color: '#8a96a8' },
                        ticks: { callback: v => (v / 1e9).toFixed(1).replace('.', ',') + 'B' }
                    },
                    y: {
                        grid: GRID,
                        title: { display: true, text: `MVI (por 100 mil hab.) — ${ano}`, color: '#8a96a8' }
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
    fetch(`tabela_dados.php?tabela=${encodeURIComponent(tabela)}`)
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
            <td>${r.ano2022 || '—'}</td>
            <td>${r.ano2023 || '—'}</td>
            <td>${r.ano2024 || '—'}</td>
        </tr>
    `).join('');
}

if (tabelaSelect) tabelaSelect.addEventListener('change', () => carregarTabela(tabelaSelect.value));
if (buscaInput) buscaInput.addEventListener('input', filtrarTabela);