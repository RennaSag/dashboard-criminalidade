<?php
// conectar.php - versão PostgreSQL (Neon)
// Mantém a mesma API usada nos outros arquivos (->query, ->num_rows,
// ->fetch_assoc(), ->connect_error, ->error) para não precisar reescrever
// index.php, tabela_dados.php, clusters_dados.php e clusters_taxa_dados.php.

class PgResult
{
    private array $rows;
    public int $num_rows;
    private int $pos = 0;

    public function __construct(array $rows)
    {
        $this->rows = $rows;
        $this->num_rows = count($rows);
    }

    public function fetch_assoc()
    {
        if ($this->pos >= $this->num_rows) return null;
        return $this->rows[$this->pos++];
    }
}

class PgConn
{
    public ?PDO $pdo = null;
    public ?string $connect_error = null;
    public ?string $error = null;

    public function __construct(string $host, string $user, string $password, string $dbname, string $port = '5432')
    {
        try {
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";
            $this->pdo = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
        } catch (PDOException $e) {
            $this->connect_error = $e->getMessage();
        }
    }

    // aceita $tabela interpolado com aspas duplas (padrão Postgres) ou sem aspas
    public function query(string $sql)
    {
        try {
            $stmt = $this->pdo->query($sql);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return new PgResult($rows);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return false;
        }
    }
}

$host     = getenv('DB_HOST') ?: 'localhost';
$user     = getenv('DB_USER') ?: 'postgres';
$password = getenv('DB_PASSWORD') ?: '';
$banco    = getenv('DB_NAME') ?: 'dadostcc';
$port     = getenv('DB_PORT') ?: '5432';

$conn = new PgConn($host, $user, $password, $banco, $port);

if ($conn->connect_error) {
    die("Erro na conexão: " . $conn->connect_error);
}