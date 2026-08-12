<?php

include("../conectar.php");
header('Content-Type: application/json; charset=utf-8');

$tipo = $_GET['tipo'] ?? 'modelos';

if ($tipo === 'modelos') {
    $result = $conn->query(
        'SELECT nome, descricao, variaveis, r2, r2_adj, f_stat, f_pvalue, n_obs, significativo
         FROM regressao_modelo ORDER BY r2_adj DESC'
    );
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'nome'          => $row['nome'],
            'descricao'     => $row['descricao'],
            'variaveis'     => $row['variaveis'],
            'r2'            => (float) $row['r2'],
            'r2_adj'        => (float) $row['r2_adj'],
            'f_stat'        => (float) $row['f_stat'],
            'f_pvalue'      => (float) $row['f_pvalue'],
            'n_obs'         => (int) $row['n_obs'],
            'significativo' => filter_var($row['significativo'], FILTER_VALIDATE_BOOLEAN),
        ];
    }
    echo json_encode(['rows' => $rows]);

} elseif ($tipo === 'coeficientes') {
    $modelo = $_GET['modelo'] ?? '';
    $modeloEscapado = $conn->pdo->quote($modelo);

    $result = $conn->query(
        "SELECT modelo, variavel, coeficiente, erro_padrao, t_stat, p_value, significativo, interpretacao
         FROM regressao_coeficientes WHERE modelo = $modeloEscapado ORDER BY variavel ASC"
    );
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'modelo'        => $row['modelo'],
            'variavel'      => $row['variavel'],
            'coeficiente'   => (float) $row['coeficiente'],
            'erro_padrao'   => (float) $row['erro_padrao'],
            't_stat'        => (float) $row['t_stat'],
            'p_value'       => (float) $row['p_value'],
            'significativo' => filter_var($row['significativo'], FILTER_VALIDATE_BOOLEAN),
            'interpretacao' => $row['interpretacao'],
        ];
    }
    echo json_encode(['rows' => $rows]);

} else {
    http_response_code(400);
    echo json_encode(['error' => 'tipo inválido. Use: modelos | coeficientes']);
}