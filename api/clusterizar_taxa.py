import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

from db import get_connection

PERFIS = {
    0: 'Baixa Criminalidade / Baixo Investimento',
    1: 'Alta Criminalidade / Alto Investimento',
    2: 'Criminalidade Moderada / Investimento Moderado',
    3: 'Alta Criminalidade / Baixo Investimento',
}


def limpar_numero(valor):
    if valor is None or valor == '' or valor == '-':
        return None
    v = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(v)
    except Exception:
        return None


def media_estado(cursor, tabela):
    cursor.execute(f'SELECT estado, ano2022, ano2023, ano2024 FROM {tabela}')
    rows = cursor.fetchall()
    result = {}
    for estado, a2022, a2023, a2024 in rows:
        vals = [limpar_numero(v) for v in [a2022, a2023, a2024]]
        vals = [v for v in vals if v is not None]
        result[estado] = float(sum(vals) / len(vals)) if vals else None
    return result


def main():
    print('=== Clusterização K-Means (taxa) — Segurança Pública (PostgreSQL/Neon) ===')
    conn = get_connection()
    cur = conn.cursor()

    tabelas = {
        'mvi_taxa':                   'mvi_taxa',
        'trafico_de_drogas_taxa':     'trafico_de_drogas_taxa',
        'feminicidio_taxa':           'feminicidio_taxa',
        'roubo_furto_veiculos_taxa':  'roubo_furto_veiculos_taxa',
        'roubo_furto_celulares_taxa': 'roubo_furto_celulares_taxa',
        'policiamento':               'policiamento',
        'defesa_civil':               'defesa_civil',
        'demais_servicos':            'demais_servicos',
        'informacoes_e_inteligencia': 'informacoes_e_inteligencia',
    }

    dados = {}
    for chave, tabela in tabelas.items():
        dados[chave] = media_estado(cur, tabela)
        print(f'  {tabela}: {len(dados[chave])} estados carregados')

    estados = sorted(dados['mvi_taxa'].keys())
    registros = []
    for estado in estados:
        row = {'estado': estado}
        for chave in tabelas:
            val = dados[chave].get(estado)
            row[chave] = val if val is not None else 0.0
        registros.append(row)

    df = pd.DataFrame(registros).set_index('estado')
    print(f'\nEstados com dados: {len(df)}')

    scaler = StandardScaler()
    X = scaler.fit_transform(df)

    K = 4
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=20)
    labels = kmeans.fit_predict(X)
    sil = silhouette_score(X, labels)
    print(f'Silhouette score (k={K}): {sil:.3f}')

    centros = pd.DataFrame(scaler.inverse_transform(kmeans.cluster_centers_), columns=df.columns)
    ordem = centros['mvi_taxa'].argsort().values
    mapa_label = {int(ordem[i]): i for i in range(K)}
    labels_remapeados = [mapa_label[l] for l in labels]

    cur.execute('''
        CREATE TABLE IF NOT EXISTS clusters_taxa (
            id                  SERIAL PRIMARY KEY,
            estado              VARCHAR(60),
            cluster_id          INT,
            perfil              VARCHAR(120),
            score_mvi           DOUBLE PRECISION,
            score_investimento  DOUBLE PRECISION
        )
    ''')
    cur.execute('DELETE FROM clusters_taxa')

    for i, estado in enumerate(df.index):
        cluster_final = labels_remapeados[i]
        perfil = PERFIS.get(cluster_final, f'Cluster {cluster_final}')
        score_mvi = float(df.loc[estado, 'mvi_taxa'])
        score_inv = float(df.loc[estado, 'policiamento'])
        cur.execute(
            'INSERT INTO clusters_taxa (estado, cluster_id, perfil, score_mvi, score_investimento) VALUES (%s, %s, %s, %s, %s)',
            (estado, cluster_final, perfil, score_mvi, score_inv)
        )
        print(f'  {estado:30s} -> Cluster {cluster_final} | {perfil}')

    conn.commit()
    cur.close()
    conn.close()
    print('\n✓ Clusters (taxa) atualizados no banco com sucesso.')


if __name__ == '__main__':
    main()
