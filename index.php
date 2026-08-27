<?php
include("conectar.php");

$anos = range(2016, 2025);

function getDados($conn, $tabela)
{
    $sql = "SELECT * FROM $tabela ORDER BY estado ASC";
    $result = $conn->query($sql);
    $dados = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $dados[] = $row;
        }
    }
    return $dados;
}

function limparNumero($valor)
{
    if ($valor == NULL || $valor == "" || $valor == "-" || $valor == "0,00") return null;

    if (preg_match('/^\d+(\.\d+)?$/', trim($valor))) {
        return floatval($valor);
    }

    $v = str_replace(".", "", $valor);
    $v = str_replace(",", ".", $v);
    return floatval($v);
}

// carrega todos os dados
$mvi            = getDados($conn, "mvi_taxa");
$trafico        = getDados($conn, "trafico_de_drogas_taxa");
$feminicidio    = getDados($conn, "feminicidio_taxa");
$roubo_veiculos = getDados($conn, "roubo_furto_veiculos_taxa");
$roubo_celulares  = getDados($conn, "roubo_furto_celulares_taxa");
$policiamento   = getDados($conn, "policiamento");
$defesa_civil   = getDados($conn, "defesa_civil");
$inteligencia   = getDados($conn, "informacoes_e_inteligencia");
$demais         = getDados($conn, "demais_servicos");

function somarGastos($dados, $ano = "ano2025")
{
    $total = 0;
    foreach ($dados as $row) {
        $v = limparNumero($row[$ano] ?? null);
        if ($v !== null) $total += $v;
    }
    return $total;
}

$total_policiamento  = somarGastos($policiamento);
$total_defesa        = somarGastos($defesa_civil);
$total_inteligencia  = somarGastos($inteligencia);
$total_demais        = somarGastos($demais);
$total_geral         = $total_policiamento + $total_defesa + $total_inteligencia + $total_demais;

function mediaNacional($dados, $ano = "ano2025")
{
    $vals = [];
    foreach ($dados as $row) {
        $v = limparNumero($row[$ano] ?? null);
        if ($v !== null) $vals[] = $v;
    }
    return count($vals) > 0 ? array_sum($vals) / count($vals) : 0;
}

$media_mvi        = mediaNacional($mvi);
$media_trafico    = mediaNacional($trafico);
$media_feminicidio = mediaNacional($feminicidio);

function mapearPorEstado($dados, $campo_ano = "ano2025")
{
    $mapa = [];
    foreach ($dados as $row) {
        $mapa[$row['estado']] = limparNumero($row[$campo_ano] ?? null);
    }
    return $mapa;
}

// serie historica: monta {estado: valor} para CADA ano, para cada indicador
function porAnoTodos($dados, $anos)
{
    $out = [];
    foreach ($anos as $ano) {
        $out[$ano] = mapearPorEstado($dados, "ano$ano");
    }
    return $out;
}

$estados_labels = json_encode(array_column($mvi, 'estado'));

$mvi_por_ano            = porAnoTodos($mvi, $anos);
$trafico_por_ano        = porAnoTodos($trafico, $anos);
$feminicidio_por_ano    = porAnoTodos($feminicidio, $anos);
$rouboVeiculos_por_ano  = porAnoTodos($roubo_veiculos, $anos);
$rouboCelulares_por_ano = porAnoTodos($roubo_celulares, $anos);
$policiamento_por_ano   = porAnoTodos($policiamento, $anos);
$defesaCivil_por_ano    = porAnoTodos($defesa_civil, $anos);
$inteligencia_por_ano   = porAnoTodos($inteligencia, $anos);
$demaisServicos_por_ano = porAnoTodos($demais, $anos);

$gastos_categorias = json_encode([
    'Policiamento'    => round($total_policiamento),
    'Defesa Civil'    => round($total_defesa),
    'Inteligência'    => round($total_inteligencia),
    'Demais Serviços' => round($total_demais),
]);
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Segurança Pública - Brasil</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="assets/css/dashboard.css?v=<?= @filemtime(__DIR__ . '/assets/css/dashboard.css') ?>">
</head>

<body>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <!-- sidebar -->
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
            <span class="brand-icon">⬡</span>
            <div>
                <div class="brand-title">Seg. Pública</div>
                <div class="brand-sub">Dashboard · Brasil</div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <a href="#visao-geral" class="nav-item active" data-section="visao-geral">
                <span class="nav-icon">◈</span> Visão Geral
            </a>
            <a href="#mapa" class="nav-item" data-section="mapa">
                <span class="nav-icon">◉</span> Mapa de Calor
            </a>
            <a href="#criminalidade" class="nav-item" data-section="criminalidade">
                <span class="nav-icon">◇</span> Criminalidade
            </a>
            <a href="#investimentos" class="nav-item" data-section="investimentos">
                <span class="nav-icon">◆</span> Investimentos
            </a>

            <a href="#analise-ml" class="nav-item" data-section="analise-ml">
                <span class="nav-icon">◎</span> Análise Preditiva
            </a>

            <a href="#clusters-taxa" class="nav-item" data-section="clusters-taxa">
                <span class="nav-icon">◍</span> Cluster por Taxas
            </a>

            <a href="#regressao" class="nav-item" data-section="regressao">
                <span class="nav-icon">◱</span> Regressão Múltipla
            </a>

            <a href="#tabela" class="nav-item" data-section="tabela">
                <span class="nav-icon">▦</span> Dados Detalhados
            </a>

            <a href="#sobre" class="nav-item" data-section="sobre">
                <span class="nav-icon">ⓘ</span> Sobre
            </a>

        </nav>
        <div class="sidebar-footer">
            <div class="update-badge">
                <span class="pulse-dot"></span>
                Dados: 2016 – 2025
            </div>
            <div class="fonte-text">Fórum Brasileiro de Seg. Pública - STN</div>
        </div>
    </aside>

    <!-- main -->
    <main class="main">

        <!-- topbar -->
        <header class="topbar">
            <button id="menu-toggle" class="menu-toggle" aria-label="Abrir menu">☰</button>
            <div class="topbar-title">
                <h1>Dashboard de <span class="accent">Segurança Pública</span></h1>
                <p class="topbar-sub">Correlação do investimento em segurança pública com índices de criminalidade.</p>
            </div>
            <div class="topbar-controls">
                <select id="ano-selector" class="control-select">
                    <?php foreach ($anos as $ano): ?>
                        <option value="<?= $ano ?>" <?= $ano == 2025 ? 'selected' : '' ?>><?= $ano ?></option>
                    <?php endforeach; ?>
                </select>
                <select id="indicador-selector" class="control-select">
                    <option value="mvi">MVI (Mortes Violentas)</option>
                    <option value="trafico">Tráfico de Drogas</option>
                    <option value="feminicidio">Feminicídio</option>
                    <option value="rouboVeiculos">Roubo/Furto Veículos</option>
                    <option value="rouboCelulares">Roubo/Furto Celulares</option>
                </select>
            </div>
        </header>

        <!-- secao visao geral -->
        <section id="visao-geral" class="section active">
            <div class="section-header">
                <div class="section-tag">VISÃO GERAL</div>
                <h2>Panorama Nacional · <span id="ano-display">2024</span></h2>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card kpi-danger">
                    <div class="kpi-label">Média Nacional MVI</div>
                    <div class="kpi-value"><?= number_format($media_mvi, 1, ',', '.') ?></div>
                    <div class="kpi-unit">por 100 mil hab.</div>
                    <div class="kpi-bar">
                        <div class="kpi-fill" style="width:<?= min(100, ($media_mvi / 60) * 100) ?>%"></div>
                    </div>
                </div>
                <div class="kpi-card kpi-warning">
                    <div class="kpi-label">Média Tráfico de Drogas</div>
                    <div class="kpi-value"><?= number_format($media_trafico, 1, ',', '.') ?></div>
                    <div class="kpi-unit">por 100 mil hab.</div>
                    <div class="kpi-bar">
                        <div class="kpi-fill" style="width:<?= min(100, ($media_trafico / 200) * 100) ?>%"></div>
                    </div>
                </div>
                <div class="kpi-card kpi-alert">
                    <div class="kpi-label">Média Feminicídio</div>
                    <div class="kpi-value"><?= number_format($media_feminicidio, 1, ',', '.') ?></div>
                    <div class="kpi-unit">por 100 mil mulheres</div>
                    <div class="kpi-bar">
                        <div class="kpi-fill" style="width:<?= min(100, ($media_feminicidio / 10) * 100) ?>%"></div>
                    </div>
                </div>
                <div class="kpi-card kpi-invest">
                    <div class="kpi-label">Investimento Total (2024)</div>
                    <div class="kpi-value">R$ <?= number_format($total_geral / 1e9, 1, ',', '.') ?>B</div>
                    <div class="kpi-unit">bilhões em segurança pública</div>
                    <div class="kpi-bar">
                        <div class="kpi-fill" style="width:75%"></div>
                    </div>
                </div>
            </div>

            <div class="mini-charts-row">
                <div class="chart-card">
                    <div class="chart-label" title="Homicídios dolósos, latrocínio (roubo seguido de morte), lesão corporal seguida de morte, mortes decorrentes de intervenção policial.">MVI por Estado - 2024</div>
                    <canvas id="chart-mvi-bar" height="180"></canvas>
                </div>
                <div class="chart-card chart-donut-wrap">
                    <div class="chart-label" title="Apresenta as diferentes formas de investimento em segurança pública (disponíveis nos anuários oficiais)">Distribuição do Investimento</div>
                    <canvas id="chart-gastos-donut" height="180"></canvas>
                </div>
            </div>
        </section>

        <!-- secao mapa -->
        <section id="mapa" class="section">
            <div class="section-header">
                <div class="section-tag">MAPA DE CALOR</div>
                <h2>Hot Spots Criminais por Estado</h2>
            </div>
            <div class="map-layout">
                <div id="mapa-brasil" class="map-container"></div>
                <div class="map-legend-panel">
                    <div class="legend-title">Indicador selecionado</div>
                    <div class="legend-scale">
                        <div class="legend-gradient"></div>
                        <div class="legend-labels"><span>Menor</span><span>Maior</span></div>
                    </div>
                    <div id="map-estado-info" class="estado-info-box">
                        <div class="info-hint"> Passe o cursor sobre um estado</div>
                    </div>

                </div>
            </div>
        </section>


        <!-- secao criminalidade -->
        <section id="criminalidade" class="section">
            <div class="section-header">
                <div class="section-tag">CRIMINALIDADE</div>
                <h2>Evolução dos Indicadores 2022-2024</h2>
            </div>

            <div class="chart-card tall full-width">
                <div class="chart-label" title="Homicídios dolósos, latrocínio (roubo seguido de morte), lesão corporal seguida de morte, mortes decorrentes de intervenção policial.">
                    Mortes Violentas Intencionais - Série Histórica
                </div>
                <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;">
                    <label style="font-size:12px;font-weight:700;color:var(--text-muted);">Estado:</label>
                    <select id="crim-mvi-estado-select" class="control-select" style="padding:6px 28px 6px 10px;font-size:13px;"></select>
                </div>
                <canvas id="chart-mvi-line" height="160"></canvas>
            </div>

            <div class="chart-card tall full-width">
                <div class="chart-label" title="Comercialização, transporte ou distribuição de qualquer substância ilícita.">
                    Tráfico de Drogas por Estado
                </div>
                <canvas id="chart-trafico-bar" height="160"></canvas>
            </div>

            <div class="chart-card full-width">
                <div class="chart-label" title="Decorre de violência doméstica e familiar, ou de menosprezo/discriminação à condição de mulher.">
                    Feminicídio por Estado
                </div>
                <canvas id="chart-feminicidio-bar" height="160"></canvas>
            </div>

            <div class="chart-card full-width">
                <div class="chart-label">Comparativo: Roubo/Furto de Veículos e Celulares por Estado</div>
                <canvas id="chart-roubo-bar" height="160"></canvas>
            </div>

        </section>



        <!-- secao investimentos -->
        <section id="investimentos" class="section">
            <div class="section-header">
                <div class="section-tag">INVESTIMENTOS</div>
                <h2>Gastos em Segurança Pública por Estado</h2>
            </div>

            <!-- linha policiamento + defesa civil -->
            <div class="charts-2col">
                <div class="chart-card tall">
                    <div class="chart-label">Policiamento</div>
                    <canvas id="chart-policiamento" height="280"></canvas>
                </div>
                <div class="chart-card tall">
                    <div class="chart-label">Defesa Civil</div>
                    <canvas id="chart-defesa" height="280"></canvas>
                </div>
            </div>

            <!-- linha inteligência + demais serviços -->
            <div class="charts-2col">
                <div class="chart-card tall">
                    <div class="chart-label">Informações e Inteligência</div>
                    <canvas id="chart-inteligencia" height="280"></canvas>
                </div>
                <div class="chart-card tall">
                    <div class="chart-label">Demais Serviços</div>
                    <canvas id="chart-demais" height="280"></canvas>
                </div>
            </div>

        </section>


<!-- secao analise preditiva -->
<section id="analise-ml" class="section">
    <div class="section-header">
        <div class="section-tag">MACHINE LEARNING · REGRESSÃO & CORRELAÇÃO</div>
        <h2>Análise Preditiva e Eficiência de Investimento</h2>
    </div>

    <!-- KPI rápidos (preenchidos via JS) -->
    <div class="kpi-grid" id="ml-kpi-grid" style="grid-template-columns: repeat(4,1fr);"></div>

    
    <div class="ml-tabs" style="display:flex;gap:8px;margin:24px 0 16px;">
        <button class="ml-tab active" data-tab="previsao">Previsão 2025–2026</button>
        <button class="ml-tab"        data-tab="correlacao">Correlação de Pearson</button>
        <button class="ml-tab"        data-tab="eficiencia">Eficiência de Investimento</button>
    </div>

    <!-- painel previsao -->
    <div id="ml-painel-previsao" class="ml-painel active">
        <div class="charts-2col">
            <div class="chart-card">
                <div class="chart-label">Tendência da Taxa de MVI por Estado (2022–2026)</div>
                <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;">
                    <label style="font-size:12px;font-weight:700;color:var(--text-muted);">Estado:</label>
                    <select id="previsao-estado-select" class="control-select" style="padding:6px 28px 6px 10px;font-size:13px;"></select>
                </div>
                <canvas id="chart-previsao-linha" height="220"></canvas>
            </div>
            <div class="chart-card">
                <div class="chart-label">Previsão 2025 vs 2026 — Todos os Estados</div>
                <canvas id="chart-previsao-bar" height="220"></canvas>
            </div>
        </div>

        <div class="table-wrapper" style="margin-top:16px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Estado</th>
                        <th>MVI 2016</th>
                        <th>MVI 2025</th>
                        <th>Previsão 2026</th>
                        <th>Tendência</th>
                        <th>R²</th>
                    </tr>
                </thead>
                <tbody id="previsao-tabela-body">
                    <tr><td colspan="8" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
        <div class="fonte">
            <strong>Regressão Linear (OLS)</strong> — Projeção da taxa de MVI (por 100 mil hab.) para 2025 e 2026, treinada com os anos 2022–2024 por estado. Coeficiente angular indica variação anual esperada. R² indica o ajuste do modelo aos dados históricos. Fonte dos dados: Fórum Brasileiro de Segurança Pública · IBGE.
        </div>
    </div>

    <!-- painel correlacao -->
    <div id="ml-painel-correlacao" class="ml-painel" style="display:none;">
        <div class="charts-2col">
            <div class="chart-card">
                <div class="chart-label">Coeficiente de Pearson (r) — Investimento Total × Taxa de MVI</div>
                <canvas id="chart-correlacao-bar" height="260"></canvas>
            </div>
            <div class="chart-card">
                <div class="chart-label">Scatter: Investimento Médio (R$) × MVI Médio (taxa/100mil)</div>
                <canvas id="chart-correlacao-scatter" height="260"></canvas>
            </div>
        </div>

        <div class="table-wrapper" style="margin-top:16px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Estado</th>
                        <th>Pearson r</th>
                        <th>p-value</th>
                        <th>Força</th>
                        <th>Direção</th>
                        <th>Invest. Médio</th>
                        <th>MVI Médio</th>
                    </tr>
                </thead>
                <tbody id="correlacao-tabela-body">
                    <tr><td colspan="7" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
        <div class="fonte">
            <strong>Correlação de Pearson</strong> — Mede a associação linear entre o investimento público total em segurança (policiamento + defesa civil + inteligência + demais serviços) e a taxa de MVI por estado, usando os 3 pares de dados anuais (2022, 2023, 2024). r &gt; 0 indica que mais investimento acompanha mais criminalidade (estados estruturalmente mais violentos recebem mais recursos); r &lt; 0 indica associação inversa. Fonte: STN · Fórum Brasileiro de Segurança Pública.
        </div>
    </div>

    <!-- painel eficiencia -->
    <div id="ml-painel-eficiencia" class="ml-painel" style="display:none;">
        <div class="charts-2col">
            <div class="chart-card">
                <div class="chart-label">Ranking de Eficiência — Redução de MVI por Bilhão Investido</div>
                <canvas id="chart-eficiencia-bar" height="300"></canvas>
            </div>
            <div class="chart-card">
                <div class="chart-label">Variação % do MVI (2022→2024) por Estado</div>
                <canvas id="chart-variacao-mvi" height="300"></canvas>
            </div>
        </div>

        <div class="table-wrapper" style="margin-top:16px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Estado</th>
                        <th>MVI 2016</th>
                        <th>MVI 2025</th>
                        <th>Variação MVI</th>
                        <th>Variação %</th>
                        <th>Invest. Médio (R$ B)</th>
                        <th>Score Eficiência</th>
                    </tr>
                </thead>
                <tbody id="eficiencia-tabela-body">
                    <tr><td colspan="8" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
        <div class="fonte">
            <strong>Score de Eficiência</strong> = (-ΔMVItaxa) ÷ (Investimento médio em R$ bilhões). Quanto maior o score, mais o estado reduziu sua taxa de mortes violentas por real investido. Score negativo indica piora no período. Investimento = soma das 4 categorias (policiamento, defesa civil, inteligência, demais serviços), média 2022–2024. Fonte: STN · Fórum Brasileiro de Segurança Pública.
        </div>
    </div>
</section>


        
        <section id="regressao" class="section">
            <div class="section-header">
                <div class="section-tag">MACHINE LEARNING · REGRESSÃO MÚLTIPLA OLS</div>
                <h2>Impacto do Investimento na Taxa de MVI</h2>
            </div>

            
            <div class="kpi-grid" id="reg-kpi-grid" style="grid-template-columns: repeat(4,1fr);"></div>

            
            <div style="display:flex;align-items:center;gap:12px;margin:20px 0 16px;">
                <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;">Modelo:</label>
                <select id="reg-modelo-select" class="control-select"></select>
                <span id="reg-modelo-desc" style="font-size:13px;color:var(--text-muted);font-style:italic;"></span>
            </div>

            <div class="charts-2col">
               
                <div class="chart-card">
                    <div class="chart-label">Coeficientes — Efeito de cada R$ 1 bilhão investido na Taxa de MVI</div>
                    <canvas id="chart-reg-coef" height="240"></canvas>
                </div>
               
                <div class="chart-card">
                    <div class="chart-label">Comparativo de Ajuste entre Modelos (R² Ajustado)</div>
                    <canvas id="chart-reg-r2" height="240"></canvas>
                </div>
            </div>

         
            <div class="table-wrapper" style="margin-top:16px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Variável</th>
                            <th>Coeficiente</th>
                            <th>Erro Padrão</th>
                            <th>t-stat</th>
                            <th>p-value</th>
                            <th>Significativo</th>
                            <th>Interpretação</th>
                        </tr>
                    </thead>
                    <tbody id="reg-coef-body">
                        <tr><td colspan="7" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>

            
            <div class="table-wrapper" style="margin-top:12px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Modelo</th>
                            <th>R²</th>
                            <th>R² Ajustado</th>
                            <th>F-statistic</th>
                            <th>p-value (F)</th>
                            <th>Observações</th>
                            <th>Significativo</th>
                        </tr>
                    </thead>
                    <tbody id="reg-modelos-body">
                        <tr><td colspan="7" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="fonte">
                <strong>Regressão Múltipla OLS (Mínimos Quadrados Ordinários)</strong> — Dados em painel com 81 observações (27 estados × 3 anos: 2022, 2023, 2024). Variável dependente: taxa de MVI por 100 mil hab. Variáveis independentes: investimento por categoria em R$ bilhões. R² indica a proporção da variância do MVI explicada pelo modelo. R² ajustado penaliza a inclusão de variáveis desnecessárias. F-statistic testa se o modelo como um todo é significativo. p-value &lt; 0,05 indica que o coeficiente é estatisticamente diferente de zero. Fonte dos dados: Fórum Brasileiro de Segurança Pública · STN.
            </div>
        </section>


        
        <section id="tabela" class="section">
            <div class="section-header">
                <div class="section-tag">DADOS DETALHADOS</div>
                <h2>Consulta por Indicador</h2>
            </div>
            <div class="table-controls">

                <select name="tabela" id="tabela-select" class="control-select">   
                    <optgroup label="Criminalidade Taxas ">
                        <option value="mvi_taxa">MVI - Mortes Violentas Intencionais (Taxa por 100 mil habitantes)</option>
                        <option value="trafico_de_drogas_taxa">Tráfico de Drogas (Taxa por 100 mil habitantes)</option>
                        <option value="feminicidio_taxa">Feminicídio (Taxa por 100 mil mulheres)</option>
                        <option value="roubo_furto_veiculos_taxa">Roubo/Furto Veículos (Taxa por 100 mil veículos)</option>
                        <option value="roubo_furto_celulares_taxa">Roubo/Furto Celulares (Taxa por 100 mil habitantes)</option>
                    </optgroup>
                    <optgroup label="Investimentos">
                        <option value="policiamento">Policiamento</option>
                        <option value="defesa_civil">Defesa Civil</option>
                        <option value="informacoes_e_inteligencia">Informações e Inteligência</option>
                        <option value="demais_servicos">Demais Serviços</option>
                    </optgroup>
                </select>


                <input type="text" id="busca-estado" class="control-select" placeholder="Filtrar estado...">
            </div>
            <div class="table-wrapper">
                <table class="data-table" id="tabela-dados">
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th>2022</th>
                            <th>2023</th>
                            <th>2024</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-body">
                        <?php
                        $dados_ini = getDados($conn, "mvi_numeros_absolutos");
                        foreach ($dados_ini as $row):
                        ?>
                            <tr>
                                <td class="estado-cell"><?= htmlspecialchars($row['estado']) ?></td>
                                <td><?= $row['ano2022'] ?? '-' ?></td>
                                <td><?= $row['ano2023'] ?? '-' ?></td>
                                <td><?= $row['ano2024'] ?? '-' ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <div class="fonte" id="fonte-texto">
                <strong>MVI - Mortes Violentas Intencionais</strong> (por 100 mil hab.) - Fonte: Sec. Estaduais; ISP/RJ; Polícias Civis e Militares; IBGE; Fórum Brasileiro de Segurança Pública.
            </div>
        </section>


        
        <section id="clusters-taxa" class="section">
            <div class="section-header">
                <div class="section-tag">MACHINE LEARNING TAXAS</div>
                <h2>Clusterização por Taxas K-Means</h2>
            </div>
            <div class="kpi-grid" id="cluster-taxa-kpi-grid" style="grid-template-columns: repeat(4,1fr);"></div>
            <div class="charts-2col" style="margin-top:16px;">
                <div class="chart-card">
                    <div class="chart-label">Distribuição dos Estados por Cluster</div>
                    <canvas id="chart-cluster-taxa-bar" height="220"></canvas>
                </div>
                <div class="chart-card">
                    <div class="chart-label">MVI Médio (taxa) vs Investimento por Cluster</div>
                    <canvas id="chart-cluster-taxa-scatter" height="220"></canvas>
                </div>
            </div>
            
            <div class="table-wrapper" style="margin-top:16px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th>Cluster</th>
                            <th>Perfil</th>
                            <th>MVI Médio (taxa/100mil)</th>
                            <th>Policiamento Médio</th>
                        </tr>
                    </thead>
                    <tbody id="cluster-taxa-tabela-body">
                        <tr><td colspan="5" style="text-align:center;color:#8a96a8;padding:24px;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="fonte">
                <strong>Clusterização K-Means (k=4) · Taxas por 100 mil habitantes</strong> — Agrupamento dos 27 estados com base na média 2022–2024 de 5 indicadores de taxa (MVI, Tráfico, Feminicídio, Roubo de Veículos, Roubo de Celulares) + 4 de investimento. Features normalizadas via Z-score. Fonte: Fórum Brasileiro de Segurança Pública · STN.
            </div>
        </section>


        <!-- secao sobre -->
        <section id="sobre" class="section">
            <div class="section-header">
                <div class="section-tag">SOBRE O PROJETO</div>
                <h2>Trabalho de Conclusão de Curso</h2>
            </div>

            <p class="sobre-lead">
                Este dashboard foi desenvolvido como <strong>Trabalho de Conclusão de Curso (TCC)</strong> por
                <strong>Rennã Sag</strong>, no <strong>Instituto Federal Goiano</strong>. A proposta nasceu da
                necessidade de tornar acessível e visual uma questão complexa da administração pública brasileira:
                como o dinheiro investido em segurança pública se relaciona, de fato, com os índices de
                criminalidade em cada estado do país.
            </p>

            <div class="charts-2col">
                <div class="chart-card">
                    <div class="chart-label">O que é este projeto</div>
                    <p style="font-size:14px;color:var(--text-dim);line-height:1.8;">
                        Um <strong>dashboard interativo</strong> que cruza dados oficiais de criminalidade
                        (Fórum Brasileiro de Segurança Pública) com dados de investimento público em segurança
                        (Secretaria do Tesouro Nacional), permitindo visualizar padrões espaciais, identificar
                        <em>hot spots</em> criminais e comparar a eficiência do investimento entre os 27 estados
                        brasileiros, no período de 2016 a 2025.
                    </p>
                </div>
                <div class="chart-card">
                    <div class="chart-label">Objetivo Acadêmico</div>
                    <p style="font-size:14px;color:var(--text-dim);line-height:1.8;">
                        Apoiar a <strong>tomada de decisão baseada em evidências</strong>, aplicando conceitos de
                        Business Intelligence, análise espacial do crime e teoria dos hot spots criminais a um
                        problema real de gestão pública, servindo como ferramenta de estudo para pesquisas
                        acadêmicas e para a formulação de políticas de segurança.
                    </p>
                </div>
            </div>

            <div class="chart-card full-width" style="margin-top:16px;">
                <div class="chart-label">O que você encontra aqui</div>
                <div class="sobre-feature-grid">
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◉</span>
                        <div>
                            <div class="sobre-feature-title">Mapa de Calor</div>
                            <div class="sobre-feature-desc">Visualização geográfica interativa dos indicadores por estado.</div>
                        </div>
                    </div>
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◇</span>
                        <div>
                            <div class="sobre-feature-title">Criminalidade</div>
                            <div class="sobre-feature-desc">Série histórica de MVI, tráfico, feminicídio e roubo/furto.</div>
                        </div>
                    </div>
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◆</span>
                        <div>
                            <div class="sobre-feature-title">Investimentos</div>
                            <div class="sobre-feature-desc">Gastos públicos em policiamento, defesa civil e inteligência.</div>
                        </div>
                    </div>
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◎</span>
                        <div>
                            <div class="sobre-feature-title">Análise Preditiva</div>
                            <div class="sobre-feature-desc">Regressão linear, correlação de Pearson e eficiência do gasto.</div>
                        </div>
                    </div>
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◍</span>
                        <div>
                            <div class="sobre-feature-title">Clusterização</div>
                            <div class="sobre-feature-desc">Agrupamento de estados por perfil via K-Means.</div>
                        </div>
                    </div>
                    <div class="sobre-feature">
                        <span class="sobre-feature-icon">◱</span>
                        <div>
                            <div class="sobre-feature-title">Regressão Múltipla</div>
                            <div class="sobre-feature-desc">Impacto de cada categoria de investimento na taxa de MVI.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="charts-2col" style="margin-top:16px;">
                <div class="chart-card">
                    <div class="chart-label">Tecnologias Utilizadas</div>
                    <div class="tech-badges">
                        <span class="tech-badge">PHP</span>
                        <span class="tech-badge">MySQL</span>
                        <span class="tech-badge">Python</span>
                        <span class="tech-badge">scikit-learn</span>
                        <span class="tech-badge">JavaScript</span>
                        <span class="tech-badge">Chart.js</span>
                        <span class="tech-badge">Leaflet.js</span>
                        <span class="tech-badge">D3.js</span>
                        <span class="tech-badge">HTML5 / CSS3</span>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-label">Metodologia</div>
                    <ol class="sobre-metodologia">
                        <li>Coleta de dados oficiais de criminalidade e investimento público;</li>
                        <li>Tratamento, limpeza e normalização dos dados;</li>
                        <li>Cálculo de indicadores e modelos estatísticos (regressão, correlação, clusterização);</li>
                        <li>Visualização interativa em dashboard web;</li>
                        <li>Validação e testes de consistência dos resultados.</li>
                    </ol>
                </div>
            </div>

            <div class="sobre-author-card">
                <div class="sobre-author-avatar">RS</div>
                <div class="sobre-author-info">
                    <div class="sobre-author-name">Rennã Sag</div>
                    <div class="sobre-author-role">Autor · Instituto Federal Goiano</div>
                </div>
            </div>

            <div class="fonte" style="margin-top:16px;">
                <strong>Fontes de dados:</strong> Portal da Transparência do Governo Federal, Secretaria do Tesouro
                Nacional (STN), Fórum Brasileiro de Segurança Pública, Secretarias Estaduais de Segurança Pública,
                ISP/RJ e IBGE. Este projeto tem finalidade acadêmica, não substituindo estatísticas oficiais
                publicadas pelos órgãos competentes.
            </div>
        </section>

    </main>

    
    <script>
        const DATA = {
            estados: <?= $estados_labels ?>,
            anos: <?= json_encode($anos) ?>,
            gastosCategorias: <?= $gastos_categorias ?>,
            porAno: {
                mvi: <?= json_encode($mvi_por_ano) ?>,
                trafico: <?= json_encode($trafico_por_ano) ?>,
                feminicidio: <?= json_encode($feminicidio_por_ano) ?>,
                rouboVeiculos: <?= json_encode($rouboVeiculos_por_ano) ?>,
                rouboCelulares: <?= json_encode($rouboCelulares_por_ano) ?>,
                policiamento: <?= json_encode($policiamento_por_ano) ?>,
                defesaCivil: <?= json_encode($defesaCivil_por_ano) ?>,
                inteligencia: <?= json_encode($inteligencia_por_ano) ?>,
                demaisServicos: <?= json_encode($demaisServicos_por_ano) ?>,
            },
        };

        const FONTES = {
            mvi_numeros_absolutos: "<strong>MVI - Mortes Violentas Intencionais</strong> (Números Absolutos) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; Polícias Civis e Militares; IBGE; Fórum Brasileiro de Segurança Pública.",
            trafico_de_drogas_numeros_absolutos: "<strong>Tráfico de Drogas</strong> (Números Absolutos) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
            feminicidio_numeros_absolutos: "<strong>Feminicídio</strong> (Números Absolutos) - Fonte: Secretarias Estaduais de Segurança Pública; Ministério Público do Acre; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_veiculos_numeros_absolutos: "<strong>Roubo/Furto de Veículos</strong> (Números Absolutos) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; SENATRAN; RENAVAM; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_celulares_numeros_absolutos: "<strong>Roubo/Furto de Celulares</strong> (Números Absolutos) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
            mvi_taxa: "<strong>MVI - Mortes Violentas Intencionais</strong> (Taxa por 100 mil hab.) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; Polícias Civis e Militares; IBGE; Fórum Brasileiro de Segurança Pública.",
            trafico_de_drogas_taxa: "<strong>Tráfico de Drogas</strong> (Taxa por 100 mil hab.) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
            feminicidio_taxa: "<strong>Feminicídio</strong> (Taxa por 100 mil mulheres) - Fonte: Secretarias Estaduais de Segurança Pública; Ministério Público do Acre; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_veiculos_taxa: "<strong>Roubo/Furto de Veículos</strong> (Taxa por 100 mil hab.) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; SENATRAN; RENAVAM; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_celulares_taxa: "<strong>Roubo/Furto de Celulares</strong> (Taxa por 100 mil hab.) - Fonte: Secretarias Estaduais de Segurança Pública; ISP/RJ; IBGE; Fórum Brasileiro de Segurança Pública.",
    


            policiamento: "<strong>Gastos em Policiamento</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",

            defesa_civil: "<strong>Gastos em Defesa Civil</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",

            informacoes_e_inteligencia: "<strong>Gastos em Informações e Inteligência</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",

            demais_servicos: "<strong>Demais Serviços de Segurança</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",

   
        };
    </script>
    <script src="assets/js/dashboard.js?v=<?= @filemtime(__DIR__ . '/assets/js/dashboard.js') ?>"></script>
</body>