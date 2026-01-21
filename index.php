<?php
$apiKey = "chave api";
$ano = 2023;
$funcao = "06";
$maxPaginas = 50;


function converterValorBrasileiro($valor) {
    if ($valor === null || $valor === '') return 0.0;
    $valor = str_replace('.', '', $valor);
    $valor = str_replace(',', '.', $valor);
    return floatval($valor);
}

function obterDados($ano, $funcao, $pagina, $apiKey) {
    $url = "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-funcional-programatica";
    $params = http_build_query([
        "ano" => $ano,
        "funcao" => $funcao,
        "pagina" => $pagina
    ]);

    $ch = curl_init("$url?$params");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "accept: */*",
        "chave-api-dados: $apiKey"
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}


$dados = [];
for ($pagina = 1; $pagina <= $maxPaginas; $pagina++) {
    $resultado = obterDados($ano, $funcao, $pagina, $apiKey);
    if (!$resultado || count($resultado) === 0) break;
    $dados = array_merge($dados, $resultado);
}


$subfuncoes = [];
$totalPago = 0;

foreach ($dados as $linha) {
    if (!isset($linha['subfuncao']) || !isset($linha['pago'])) continue;

    $valorPago = converterValorBrasileiro($linha['pago']);
    $sub = $linha['subfuncao'];

    if (!isset($subfuncoes[$sub])) {
        $subfuncoes[$sub] = 0;
    }

    $subfuncoes[$sub] += $valorPago;
    $totalPago += $valorPago;
}

arsort($subfuncoes);
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Segurança Pública - 2023</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<h1>Gastos com Segurança Pública – 2023</h1>
<p><strong>Total pago:</strong> R$ <?= number_format($totalPago, 2, ',', '.') ?></p>

<table>
    <thead>
        <tr>
            <th>Subfunção</th>
            <th>Valor Pago (R$)</th>
            <th>% do Total</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($subfuncoes as $sub => $valor): 
            $percentual = ($totalPago > 0) ? ($valor / $totalPago * 100) : 0;
        ?>
        <tr>
            <td><?= htmlspecialchars($sub) ?></td>
            <td>R$ <?= number_format($valor, 2, ',', '.') ?></td>
            <td><?= number_format($percentual, 2, ',', '.') ?>%</td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<script src="script.js"></script>
</body>
</html>
