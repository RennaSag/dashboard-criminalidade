<?php
include("conectar.php");

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
$mvi            = getDados($conn, "mvi");
$trafico        = getDados($conn, "trafico_de_drogas");
$feminicidio    = getDados($conn, "feminicidio");
$roubo_veiculos = getDados($conn, "roubo_furto_veiculos");
$roubo_celulares = getDados($conn, "roubo_furto_celulares");
$policiamento   = getDados($conn, "policiamento");
$defesa_civil   = getDados($conn, "defesa_civil");
$inteligencia   = getDados($conn, "informacoes_e_inteligencia");
$demais         = getDados($conn, "demais_servicos");

function somarGastos($dados, $ano = "ano2024")
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

function mediaNacional($dados, $ano = "ano2024")
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

function mapearPorEstado($dados, $campo_ano = "ano2024")
{
    $mapa = [];
    foreach ($dados as $row) {
        $mapa[$row['estado']] = limparNumero($row[$campo_ano] ?? null);
    }
    return $mapa;
}

// serie historica para grafico de linha
$estados_labels = json_encode(array_column($mvi, 'estado'));
$mvi_2022 = json_encode(array_map(fn($r) => limparNumero($r['ano2022'] ?? null), $mvi));
$mvi_2023 = json_encode(array_map(fn($r) => limparNumero($r['ano2023'] ?? null), $mvi));
$mvi_2024 = json_encode(array_map(fn($r) => limparNumero($r['ano2024'] ?? null), $mvi));

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
    <link rel="stylesheet" href="dashboard.css">
</head>

<body>

    <!-- sidebar -->
    <aside class="sidebar">
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
            <a href="#tabela" class="nav-item" data-section="tabela">
                <span class="nav-icon">▦</span> Dados Detalhados
            </a>
        </nav>
        <div class="sidebar-footer">
            <div class="update-badge">
                <span class="pulse-dot"></span>
                Dados: 2022–2024
            </div>
            <div class="fonte-text">Fórum Brasileiro de Seg. Pública · STN</div>
        </div>
    </aside>

    <!-- main -->
    <main class="main">

        <!-- topbar -->
        <header class="topbar">
            <div class="topbar-title">
                <h1>Dashboard de <span class="accent">Segurança Pública</span></h1>
                <p class="topbar-sub">Correlação do investimento em segurança pública com índices de criminalidade.</p>
            </div>
            <div class="topbar-controls">
                <select id="ano-selector" class="control-select">
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024" selected>2024</option>
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
                        <div class="info-hint">↖ Passe o cursor sobre um estado</div>
                    </div>

                </div>
            </div>
        </section>


        <!-- secao criminalidade -->
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

            <div class="chart-card full-width" title="Subtração de um bem com/sem uso de violência ou ameaça contra a vítima.">
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
                    <div class="chart-label">Policiamento - Investimento por Estado</div>
                    <canvas id="chart-policiamento" height="280"></canvas>
                </div>
                <div class="chart-card tall">
                    <div class="chart-label">Defesa Civil - Investimento por Estado</div>
                    <canvas id="chart-defesa" height="280"></canvas>
                </div>
            </div>

            <!-- linha inteligência + demais serviços -->
            <div class="charts-2col">
                <div class="chart-card tall">
                    <div class="chart-label">Informações e Inteligência - Investimento por Estado</div>
                    <canvas id="chart-inteligencia" height="280"></canvas>
                </div>
                <div class="chart-card tall">
                    <div class="chart-label">Demais Serviços - Investimento por Estado</div>
                    <canvas id="chart-demais" height="280"></canvas>
                </div>
            </div>

        </section>

        <!-- secao tabela -->
        <!-- secao tabela -->
        <section id="tabela" class="section">
            <div class="section-header">
                <div class="section-tag">DADOS DETALHADOS</div>
                <h2>Consulta por Indicador</h2>
            </div>
            <div class="table-controls">
                <select name="tabela" id="tabela-select" class="control-select">
                    <optgroup label="Criminalidade">
                        <option value="mvi">Mortes Violentas Intencionais</option>
                        <option value="trafico_de_drogas">Tráfico de Drogas</option>
                        <option value="feminicidio">Feminicídio</option>
                        <option value="roubo_furto_veiculos">Roubo/Furto Veículos</option>
                        <option value="roubo_furto_celulares">Roubo/Furto Celulares</option>
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
                        $dados_ini = getDados($conn, "mvi");
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

    </main>

    <!-- data inject -->
    <script>
        const DATA = {
            // criminalidade - MVI (mapa por estado + arrays para gráfico de linha)
            mvi: <?= json_encode(mapearPorEstado($mvi, 'ano2024')) ?>,
            mvi2022_map: <?= json_encode(mapearPorEstado($mvi, 'ano2022')) ?>,
            mvi2023_map: <?= json_encode(mapearPorEstado($mvi, 'ano2023')) ?>,
            mvi2022: <?= $mvi_2022 ?>,
            mvi2023: <?= $mvi_2023 ?>,
            mvi2024: <?= $mvi_2024 ?>,

            // trafico
            trafico: <?= json_encode(mapearPorEstado($trafico, 'ano2024')) ?>,
            trafico2022: <?= json_encode(mapearPorEstado($trafico, 'ano2022')) ?>,
            trafico2023: <?= json_encode(mapearPorEstado($trafico, 'ano2023')) ?>,
            trafico2024: <?= json_encode(mapearPorEstado($trafico, 'ano2024')) ?>,

            // feminicidio
            feminicidio: <?= json_encode(mapearPorEstado($feminicidio, 'ano2024')) ?>,
            feminicidio2022: <?= json_encode(mapearPorEstado($feminicidio, 'ano2022')) ?>,
            feminicidio2023: <?= json_encode(mapearPorEstado($feminicidio, 'ano2023')) ?>,
            feminicidio2024: <?= json_encode(mapearPorEstado($feminicidio, 'ano2024')) ?>,

            // outros indicadores de criminalidade
            rouboVeiculos: <?= json_encode(mapearPorEstado($roubo_veiculos,  'ano2024')) ?>,
            rouboVeiculos2022: <?= json_encode(mapearPorEstado($roubo_veiculos,  'ano2022')) ?>,
            rouboVeiculos2023: <?= json_encode(mapearPorEstado($roubo_veiculos,  'ano2023')) ?>,
            rouboVeiculos2024: <?= json_encode(mapearPorEstado($roubo_veiculos,  'ano2024')) ?>,

            rouboCelulares: <?= json_encode(mapearPorEstado($roubo_celulares, 'ano2024')) ?>,
            rouboCelulares2022: <?= json_encode(mapearPorEstado($roubo_celulares, 'ano2022')) ?>,
            rouboCelulares2023: <?= json_encode(mapearPorEstado($roubo_celulares, 'ano2023')) ?>,
            rouboCelulares2024: <?= json_encode(mapearPorEstado($roubo_celulares, 'ano2024')) ?>,

            // gastos 4 categorias
            policiamento: <?= json_encode(mapearPorEstado($policiamento, 'ano2024')) ?>,
            policiamento2022: <?= json_encode(mapearPorEstado($policiamento, 'ano2022')) ?>,
            policiamento2023: <?= json_encode(mapearPorEstado($policiamento, 'ano2023')) ?>,
            policiamento2024: <?= json_encode(mapearPorEstado($policiamento, 'ano2024')) ?>,

            defesaCivil: <?= json_encode(mapearPorEstado($defesa_civil, 'ano2024')) ?>,
            defesaCivil2022: <?= json_encode(mapearPorEstado($defesa_civil, 'ano2022')) ?>,
            defesaCivil2023: <?= json_encode(mapearPorEstado($defesa_civil, 'ano2023')) ?>,
            defesaCivil2024: <?= json_encode(mapearPorEstado($defesa_civil, 'ano2024')) ?>,

            inteligencia: <?= json_encode(mapearPorEstado($inteligencia, 'ano2024')) ?>,
            inteligencia2022: <?= json_encode(mapearPorEstado($inteligencia, 'ano2022')) ?>,
            inteligencia2023: <?= json_encode(mapearPorEstado($inteligencia, 'ano2023')) ?>,
            inteligencia2024: <?= json_encode(mapearPorEstado($inteligencia, 'ano2024')) ?>,

            demaisServicos: <?= json_encode(mapearPorEstado($demais, 'ano2024')) ?>,
            demaisServicos2022: <?= json_encode(mapearPorEstado($demais, 'ano2022')) ?>,
            demaisServicos2023: <?= json_encode(mapearPorEstado($demais, 'ano2023')) ?>,
            demaisServicos2024: <?= json_encode(mapearPorEstado($demais, 'ano2024')) ?>,

            // metadados
            estados: <?= $estados_labels ?>,
            gastosCategorias: <?= $gastos_categorias ?>,
        };

        const FONTES = {
            trafico_de_drogas: "<strong>Tráfico de drogas</strong> (taxa por 100 mil hab.) - Fonte: Secretarias Estaduais de Seg. Pública; IBGE; Fórum Brasileiro de Segurança Pública.",
            feminicidio: "<strong>Feminicídio</strong> (taxa por 100 mil mulheres) - Fonte: Secretarias Estaduais; Ministério Público; IBGE; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_veiculos: "<strong>Roubo/Furto de Veículos</strong> (por 100 mil veículos) - Fonte: Sec. Estaduais; SENATRAN/RENAVAM; Fórum Brasileiro de Segurança Pública.",
            roubo_furto_celulares: "<strong>Roubo/Furto de Celulares</strong> (por 100 mil hab.) - Fonte: Sec. Estaduais; IBGE; Fórum Brasileiro de Segurança Pública.",
            mvi: "<strong>MVI - Mortes Violentas Intencionais</strong> (por 100 mil hab.) - Fonte: Sec. Estaduais; ISP/RJ; Polícias Civis e Militares; IBGE; Fórum Brasileiro de Segurança Pública.",
            policiamento: "<strong>Gastos em Policiamento</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",
            defesa_civil: "<strong>Gastos em Defesa Civil</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",
            informacoes_e_inteligencia: "<strong>Gastos em Informações e Inteligência</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",
            demais_servicos: "<strong>Demais Serviços de Segurança</strong> (R$) - Fonte: Ministério da Fazenda/STN; Fórum Brasileiro de Segurança Pública.",
        };
    </script>
    <script src="dashboard.js"></script>
</body>

</html>