<?php
// tabela_dados.php retorna JSON para preencher a tabela dinamicamente

include("../conectar.php");

$tabelasPermitidas = [
    'mvi_numeros_absolutos',
    'trafico_de_drogas_numeros_absolutos',
    'feminicidio_numeros_absolutos',
    'roubo_furto_veiculos_numeros_absolutos',
    'roubo_furto_celulares_numeros_absolutos',
    'mvi_taxa',
    'trafico_de_drogas_taxa',
    'feminicidio_taxa',
    'roubo_furto_veiculos_taxa',
    'roubo_furto_celulares_taxa',
    'policiamento',
    'defesa_civil',
    'informacoes_e_inteligencia',
    'demais_servicos'
];

$tabela = $_GET['tabela'] ?? '';

if (!in_array($tabela, $tabelasPermitidas)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tabela inválida']);
    exit;
}

$isGasto = in_array($tabela, ['policiamento', 'defesa_civil', 'informacoes_e_inteligencia', 'demais_servicos']);

function formatarValorAjax($valor, $isGasto) {
    if ($valor === NULL || $valor === '' || $valor === '-') {
        return '—';
    }
    if ($isGasto) {
        $v = floatval($valor);
        if ($v == 0) return '—';
        return 'R$ ' . number_format($v, 2, ',', '.');
    }
    return $valor;
}

$sql = "SELECT * FROM \"$tabela\" ORDER BY estado ASC";
$result = $conn->query($sql);

header('Content-Type: application/json; charset=utf-8');

if (!$result) {
    echo json_encode(['error' => $conn->error, 'rows' => []]);
    exit;
}

$rows = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'estado'  => $row['estado'],
            'ano2022' => formatarValorAjax($row['ano2022'] ?? null, $isGasto),
            'ano2023' => formatarValorAjax($row['ano2023'] ?? null, $isGasto),
            'ano2024' => formatarValorAjax($row['ano2024'] ?? null, $isGasto),
        ];
    }
}

echo json_encode(['rows' => $rows]);