import mysql.connector
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

DB = dict(host='localhost', user='root', password='', database='dadostcc')

PERFIS = {
    0: 'Baixa Criminalidade / Baixo Investimento',
    1: 'Alta Criminalidade / Alto Investimento',
    2: 'Criminalidade Moderada / Investimento Moderado',
    3: 'Alta Criminalidade / Baixo Investimento',
}

def media_estado(cursor, tabela):
    cursor.execute(f'SELECT estado, ano2022, ano2023, ano2024 FROM `{tabela}`')
    rows = cursor.fetchall()
    result = {}
    for estado, a2022, a2023, a2024 in rows:
        vals = [v for v in [a2022, a2023, a2024] if v is not None]
        result[estado] = float(sum(vals) / len(vals)) if vals else None
    return result

def main():
    conn = mysql.connector.connect(**DB)
    cur = conn.cursor()

    tabelas = {
    'mvi':                    'mvi',
    'trafico':                'trafico_de_drogas',
    'feminicidio':            'feminicidio',
    'roubo_veiculos':         'roubo_furto_veiculos',
    'roubo_celulares':        'roubo_furto_celulares',
    'policiamento':           'policiamento',
    'defesa_civil':           'defesa_civil',
    'demais_servicos':        'demais_servicos',
}

    dados = {}
    for chave, tabela in tabelas.items():
        dados[chave] = media_estado(cur, tabela)

    estados = sorted(dados['mvi'].keys())
    registros = []
    for estado in estados:
        row = {'estado': estado}
        for chave in tabelas:
            val = dados[chave].get(estado)
            row[chave] = val if val is not None else 0.0
        registros.append(row)

    df = pd.DataFrame(registros).set_index('estado')
    print(f'Estados com dados completos: {len(df)}')

    scaler = StandardScaler()
    X = scaler.fit_transform(df)

    K = 4
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=20)
    labels = kmeans.fit_predict(X)
    sil = silhouette_score(X, labels)
    print(f'Silhouette score (k={K}): {sil:.3f}')

    centros = pd.DataFrame(scaler.inverse_transform(kmeans.cluster_centers_), columns=df.columns)
    ordem = centros['mvi'].argsort().values
    mapa_label = {int(ordem[i]): i for i in range(K)}
    labels_remapeados = [mapa_label[l] for l in labels]

    cur.execute('''
        CREATE TABLE IF NOT EXISTS `clusters` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `estado` VARCHAR(60),
            `cluster_id` INT,
            `perfil` VARCHAR(120),
            `score_mvi` FLOAT,
            `score_investimento` FLOAT
        )
    ''')
    cur.execute('DELETE FROM `clusters`')

    centros_orig = pd.DataFrame(scaler.inverse_transform(kmeans.cluster_centers_), columns=df.columns)

    for i, estado in enumerate(df.index):
        cluster_orig = int(labels[i])
        cluster_final = labels_remapeados[i]
        perfil = PERFIS.get(cluster_final, f'Cluster {cluster_final}')
        score_mvi = float(df.loc[estado, 'mvi'])
        score_inv = float(df.loc[estado, 'policiamento'])
        cur.execute(
            'INSERT INTO clusters (estado, cluster_id, perfil, score_mvi, score_investimento) VALUES (%s, %s, %s, %s, %s)',
            (estado, cluster_final, perfil, score_mvi, score_inv)
        )
        print(f'  {estado:30s} -> Cluster {cluster_final} | {perfil}')

    conn.commit()
    cur.close()
    conn.close()
    print('\nClusters salvos no banco com sucesso.')

if __name__ == '__main__':
    main()