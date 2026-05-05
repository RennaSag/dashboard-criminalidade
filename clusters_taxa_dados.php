<?php
include("conectar.php");

$sql = "SELECT estado, cluster_id, perfil, score_mvi, score_investimento FROM clusters_taxa ORDER BY cluster_id, estado";
$result = $conn->query($sql);

$rows = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'estado'             => $row['estado'],
            'cluster_id'         => (int) $row['cluster_id'],
            'perfil'             => $row['perfil'],
            'score_mvi'          => (float) $row['score_mvi'],
            'score_investimento' => (float) $row['score_investimento'],
        ];
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['rows' => $rows]);