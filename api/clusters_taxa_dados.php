<?php

include("../conectar.php");
header('Content-Type: application/json; charset=utf-8');

$result = $conn->query(
    'SELECT estado, cluster_id, perfil, score_mvi, score_investimento
     FROM clusters_taxa ORDER BY cluster_id ASC, estado ASC'
);

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = [
        'estado'             => $row['estado'],
        'cluster_id'         => (int) $row['cluster_id'],
        'perfil'             => $row['perfil'],
        'score_mvi'          => (float) $row['score_mvi'],
        'score_investimento' => (float) $row['score_investimento'],
    ];
}

echo json_encode(['rows' => $rows]);