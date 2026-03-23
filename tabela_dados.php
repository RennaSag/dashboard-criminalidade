<?php
// tabela_dados.php retorna JSON para preencher a tabela dinamicamente

include("conectar.php");

$tabelasPermitidas = [
    'trafico_de_drogas', 'feminicidio', 'roubo_furto_veiculos',
    'roubo_furto_celulares', 'mvi', 'policiamento',
    'defesa_civil', 'informacoes_e_inteligencia', 'demais_servicos'
];

$tabela = $_GET['tabela'] ?? '';

if (!in_array($tabela, $tabelasPermitidas)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tabela inválida']);
    exit;
}

$isGasto = in_array($tabela, ['policiamento', 'defesa_civil', 'informacoes_e_inteligencia', 'demais_servicos']);

function formatarValorAjax($valor, $isGasto) {
    if ($valor == NULL || $valor == "" || $valor == "-" || $valor == "0,00") {
        return "—";
    }
    if ($isGasto) {
        $v = str_replace(".", "", $valor);
        $v = str_replace(",", ".", $v);
        return "R$ " . number_format(floatval($v), 2, ",", ".");
    }
    return $valor;
}

$sql = "SELECT * FROM $tabela ORDER BY estado ASC";
$result = $conn->query($sql);

$rows = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'estado'  => $row['estado'],
            'ano2022' => formatarValorAjax($row['ano2022'] ?? null, $isGasto),
            'ano2023' => formatarValorAjax($row['ano2023'] ?? null, $isGasto),
            'ano2024' => formatarValorAjax($row['ano2024'] ?? null, $isGasto),
        ];
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['rows' => $rows]);