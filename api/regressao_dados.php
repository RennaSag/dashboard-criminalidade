<?php
// api/regressao_dados.php
// Retorna modelos e coeficientes da regressão múltipla.
// Uso: regressao_dados.php?tipo=modelos | coeficientes&modelo=Modelo+Completo

include("../conectar.php");

$tipo = $_GET['tipo'] ?? 'modelos';
header('Content-Type: application/json; charset=utf-8');

function queryRows($conn, $sql, $params = []) {
    // substitui cada "?" pelo valor escapado via PDO::quote (PgConn não tem prepare/bind_param)
    foreach ($params as $p) {
        $pos = strpos($sql, '?');
        if ($pos === false) break;
        $sql = substr_replace($sql, $conn->pdo->quote($p), $pos, 1);
    }
    $result = $conn->query($sql);
    if (!$result) return [];
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    return $rows;
}

switch ($tipo) {

    case 'modelos':
        $rows = queryRows($conn,
            'SELECT nome, descricao, variaveis, r2, r2_adj, f_stat, f_pvalue, n_obs, significativo
             FROM regressao_modelo ORDER BY r2_adj DESC'
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'nome'         => $r['nome'],
                'descricao'    => $r['descricao'],
                'variaveis'    => $r['variaveis'],
                'r2'           => (float) $r['r2'],
                'r2_adj'       => (float) $r['r2_adj'],
                'f_stat'       => (float) $r['f_stat'],
                'f_pvalue'     => (float) $r['f_pvalue'],
                'n_obs'        => (int)   $r['n_obs'],
                'significativo'=> (bool)  $r['significativo'],
            ];
        }
        echo json_encode(['rows' => $out]);
        break;

    case 'coeficientes':
        $modelo = $_GET['modelo'] ?? '';
        $rows = queryRows($conn,
            'SELECT modelo, variavel, coeficiente, erro_padrao, t_stat, p_value, significativo, interpretacao
             FROM regressao_coeficientes WHERE modelo = ? ORDER BY ABS(t_stat) DESC',
            [$modelo]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'modelo'        => $r['modelo'],
                'variavel'      => $r['variavel'],
                'coeficiente'   => (float) $r['coeficiente'],
                'erro_padrao'   => (float) $r['erro_padrao'],
                't_stat'        => (float) $r['t_stat'],
                'p_value'       => (float) $r['p_value'],
                'significativo' => (bool)  $r['significativo'],
                'interpretacao' => $r['interpretacao'],
            ];
        }
        echo json_encode(['rows' => $out]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'tipo inválido. Use: modelos | coeficientes']);
}