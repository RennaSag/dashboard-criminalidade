<?php

$host = "localhost";
$user = "root";
$password = "";
$banco = "dadostcc";

$conn = new mysqli($host, $user, $password, $banco);

if ($conn->connect_error) {
    die("Erro na conexão: " . $conn->connect_error);
}