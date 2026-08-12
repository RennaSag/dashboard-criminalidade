import os
import sys
import psycopg2


def get_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        sys.exit(
            'ERRO: variável de ambiente DATABASE_URL não definida.\n'
            'Defina-a com a connection string do Neon, ex:\n'
            '  export DATABASE_URL="postgresql://usuario:senha@ep-xxxx.neon.tech/dadostcc?sslmode=require"'
        )
    return psycopg2.connect(database_url)
