<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

/* 

NECESSÁRIO: tenho que modificar a forma com que ele pede os endpoints de inicio e fim, pra 
poder ser escolhido pelo usuario e ficar bonito no dashboard

Removido os arquivos de css e js, são desnecessarios no momento apenas com backend

Foi necessária a modificação da url pra ter a localidade da despesa

No colab, o arquivo "gastos segurança pública 03" encontrou 131 páginas no ano de 2024 inteiro


Checklist das atividades
- Buscar os dados da api: ok
- Primeira versão capaz de identificar e filtar dados: ok
- Frontend como campos de interação com usuário: a fazer
- Funções js e css pra exibição do mapa do Brazil: a fazer
- Buscar dados de incidência criminal por regiões do país: a fazer

*/


$MES_ANO_INICIO = "01/2024";
$MES_ANO_FIM = "12/2024";
$CHAVE_API = "chave api";

$TAMANHO_PAGINA = 15;
$MAX_PAGINAS = 2; // limite de paginas para não ultrapassar 120 segundos de busca, necessita correção para buscar todos os dados sem limite de tempo



function obter_recursos_recebidos($mesInicio, $mesFim, $pagina, $apiKey) {
    $url = "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/recursos-recebidos";
    //url corrigida para uma possui colunas de UF em que houve a despesa, a outra não tinha isso

    $params = http_build_query([
        "mesAnoInicio" => $mesInicio,
        "mesAnoFim" => $mesFim,
        "pagina" => $pagina
    ]);

    $ch = curl_init("$url?$params");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "accept: */*",
        "chave-api-dados: $apiKey"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);


    if ($httpCode === 400) {
        return null;
    }

    return json_decode($response, true);
}


function buscar_todos_recursos_recebidos($mesInicio, $mesFim, $apiKey, $maxPaginas, $tamanhoPagina) {
    $dados = [];
    $pagina = 1;

    echo "Buscando recursos recebidos - Período $mesInicio a $mesFim<br><br>";

    while ($pagina <= $maxPaginas) {
        echo "Página $pagina... ";

        $lote = obter_recursos_recebidos($mesInicio, $mesFim, $pagina, $apiKey);

        if ($lote === null) {
            echo "(fim – página inexistente)<br>";
            break;
        }

        if (empty($lote)) {
            echo "(fim – vazio)<br>";
            break;
        }

        $dados = array_merge($dados, $lote);
        echo count($lote) . " registros<br>";

        if (count($lote) < $tamanhoPagina) {
            echo "Última página detectada.<br>";
            break;
        }

        $pagina++;
    }

    echo "<br>Total de registros obtidos: " . count($dados) . "<br><br>";
    return $dados;
}


// filtro para buscar apenas dados da segurança publica
function filtrar_seguranca_publica($dados) {
    $padrao = '/segurança|polícia|penitenci|prisional|força|criminal|bombeiro|guarda|defesa social/i';
    $filtrados = [];

    foreach ($dados as $linha) {
        $texto =
            ($linha['nomeOrgao'] ?? '') . ' ' .
            ($linha['nomeOrgaoSuperior'] ?? '') . ' ' .
            ($linha['nomeUG'] ?? '') . ' ' .
            ($linha['nomePessoa'] ?? '');

        if (preg_match($padrao, $texto)) {
            $filtrados[] = $linha;
        }
    }

    echo "Registros após filtro Segurança Pública: " . count($filtrados) . "<br><br>";
    return $filtrados;
}


function analisar_totais($dados) {
    $total = 0;

    foreach ($dados as $linha) {
        if (isset($linha['valor'])) {
            $total += floatval($linha['valor']);
        }
    }

    echo "<strong>Total de recursos recebidos:</strong> R$ " .
         number_format($total, 2, ',', '.') . "<br><br>";

    return $total;
}


echo "<pre>";

$dados = buscar_todos_recursos_recebidos(
    $MES_ANO_INICIO,
    $MES_ANO_FIM,
    $CHAVE_API,
    $MAX_PAGINAS,
    $TAMANHO_PAGINA
);

if (empty($dados)) {
    echo "Nenhum dado obtido.\n";
    exit;
}

echo "Exemplo de registro bruto:\n";
print_r($dados[0]);

$dadosSeg = filtrar_seguranca_publica($dados);
$total = analisar_totais($dadosSeg);

echo "</pre>";
