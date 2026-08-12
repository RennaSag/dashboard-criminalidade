<?php

include("../conectar.php");

$tipo = $_GET['tipo'] ?? 'previsao';

header('Content-Type: application/json; charset=utf-8');

function queryRows($conn, $sql) {
    $result = $conn->query($sql);
    if (!$result) return [];
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    return $rows;
}

switch ($tipo) {


    case 'previsao':
        $rows = queryRows($conn,
            'SELECT estado, coef_angular, r2, prev_2025, prev_2026, tendencia,
                    mvi_2022, mvi_2023, mvi_2024
             FROM previsao_mvi ORDER BY estado ASC'
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'estado'       => $r['estado'],
                'coef_angular' => (float) $r['coef_angular'],
                'r2'           => $r['r2'] !== null ? (float) $r['r2'] : null,
                'prev_2025'    => (float) $r['prev_2025'],
                'prev_2026'    => (float) $r['prev_2026'],
                'tendencia'    => $r['tendencia'],
                'mvi_2022'     => $r['mvi_2022'] !== null ? (float) $r['mvi_2022'] : null,
                'mvi_2023'     => $r['mvi_2023'] !== null ? (float) $r['mvi_2023'] : null,
                'mvi_2024'     => $r['mvi_2024'] !== null ? (float) $r['mvi_2024'] : null,
            ];
        }
        echo json_encode(['rows' => $out]);
        break;

    
    case 'correlacao':
        $rows = queryRows($conn,
            'SELECT estado, pearson_r, p_value, forca, direcao, invest_medio, mvi_medio
             FROM correlacao_estados ORDER BY pearson_r ASC'
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'estado'       => $r['estado'],
                'pearson_r'    => (float) $r['pearson_r'],
                'p_value'      => $r['p_value'] !== null ? (float) $r['p_value'] : null,
                'forca'        => $r['forca'],
                'direcao'      => $r['direcao'],
                'invest_medio' => (float) $r['invest_medio'],
                'mvi_medio'    => (float) $r['mvi_medio'],
            ];
        }
        echo json_encode(['rows' => $out]);
        break;

    
    case 'eficiencia':
        $rows = queryRows($conn,
            'SELECT ranking, estado, mvi_2022, mvi_2024, variacao_mvi,
                    variacao_pct, invest_medio_bi, score_eficiencia
             FROM eficiencia_estados ORDER BY ranking ASC'
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'ranking'          => (int)   $r['ranking'],
                'estado'           => $r['estado'],
                'mvi_2022'         => (float) $r['mvi_2022'],
                'mvi_2024'         => (float) $r['mvi_2024'],
                'variacao_mvi'     => (float) $r['variacao_mvi'],
                'variacao_pct'     => (float) $r['variacao_pct'],
                'invest_medio_bi'  => (float) $r['invest_medio_bi'],
                'score_eficiencia' => (float) $r['score_eficiencia'],
            ];
        }
        echo json_encode(['rows' => $out]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'tipo inválido. Use: previsao | correlacao | eficiencia']);
}