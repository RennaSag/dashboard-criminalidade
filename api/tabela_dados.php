<?php

include("../conectar.php");
header('Content-Type: application/json; charset=utf-8');

$tabelasPermitidas = [
    'mvi_taxa', 'trafico_de_drogas_taxa', 'feminicidio_taxa',
    'roubo_furto_veiculos_taxa', 'roubo_furto_celulares_taxa',
    'policiamento', 'defesa_civil', 'informacoes_e_inteligencia', 'demais_servicos',
    'mvi_numeros_absolutos',
];

$tabela = $_GET['tabela'] ?? '';
if (!in_array($tabela, $tabelasPermitidas, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'tabela inválida']);
    exit;
}

$result = $conn->query("SELECT estado, ano2022, ano2023, ano2024 FROM \"$tabela\" ORDER BY estado ASC");
$rows = [];
while ($row = $result->fetch_assoc()) $rows[] = $row;

echo json_encode(['rows' => $rows]);