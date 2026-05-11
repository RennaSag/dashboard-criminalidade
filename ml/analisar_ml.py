"""
analisar_ml.py
==============
Análise de Machine Learning / Estatística para o Dashboard de Segurança Pública.

O que este script faz:
  1. Regressão Linear por estado → previsão das taxas de MVI para 2025 e 2026
  2. Correlação de Pearson (investimento x criminalidade) por estado
  3. Ranking de Eficiência de Investimento (redução de MVI por real investido)

Tabelas geradas no banco:
  - previsao_mvi        → previsões 2025/2026 por estado
  - correlacao_estados  → coeficiente de Pearson e p-value por estado
  - eficiencia_estados  → ranking de eficiência de investimento

Pré-requisitos:
  pip install mysql-connector-python pandas scikit-learn scipy numpy
"""

import mysql.connector
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from scipy.stats import pearsonr
import warnings
warnings.filterwarnings('ignore')


DB = dict(host='localhost', user='root', password='', database='dadostcc')



def limpar_numero(valor):
    if valor is None or valor == '' or valor == '-':
        return None
    v = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(v)
    except Exception:
        return None


def carregar_tabela(cur, tabela):
    """Retorna dict {estado: {2022: v, 2023: v, 2024: v}}"""
    cur.execute(f'SELECT estado, ano2022, ano2023, ano2024 FROM `{tabela}`')
    rows = cur.fetchall()
    result = {}
    for estado, a2022, a2023, a2024 in rows:
        result[estado] = {
            2022: limpar_numero(a2022),
            2023: limpar_numero(a2023),
            2024: limpar_numero(a2024),
        }
    return result


def media_por_estado(dados):
    """Média dos 3 anos para cada estado, ignorando nulos."""
    medias = {}
    for estado, anos in dados.items():
        vals = [v for v in anos.values() if v is not None]
        medias[estado] = float(np.mean(vals)) if vals else None
    return medias




def regressao_linear(cur, conn):
    print('\n[1/3] Regressão Linear — Previsão de MVI (taxa) ...')

    dados = carregar_tabela(cur, 'mvi_taxa')
    anos_treino = np.array([2022, 2023, 2024]).reshape(-1, 1)

    resultados = []
    for estado, anos in dados.items():
        vals = [anos[a] for a in [2022, 2023, 2024]]

        # ignora estado com menos de 2 anos válidos
        validos = [(a, v) for a, v in zip([2022, 2023, 2024], vals) if v is not None]
        if len(validos) < 2:
            print(f'  {estado}: dados insuficientes, pulando.')
            continue

        xs = np.array([a for a, _ in validos]).reshape(-1, 1)
        ys = np.array([v for _, v in validos])

        model = LinearRegression()
        model.fit(xs, ys)

        pred_2025 = float(model.predict([[2025]])[0])
        pred_2026 = float(model.predict([[2026]])[0])

        # R² só com >= 3 pontos; com 2 é trivialmente 1.0, marca como None
        r2 = float(model.score(xs, ys)) if len(validos) == 3 else None

        # não deixa previsão negativa (criminalidade não pode ser < 0)
        pred_2025 = max(0.0, pred_2025)
        pred_2026 = max(0.0, pred_2026)

        tendencia = 'queda' if model.coef_[0] < 0 else 'alta'

        resultados.append({
            'estado': estado,
            'coef_angular': round(float(model.coef_[0]), 4),
            'intercepto': round(float(model.intercept_), 4),
            'r2': round(r2, 4) if r2 is not None else None,
            'prev_2025': round(pred_2025, 2),
            'prev_2026': round(pred_2026, 2),
            'tendencia': tendencia,
            'mvi_2022': vals[0],
            'mvi_2023': vals[1],
            'mvi_2024': vals[2],
        })
        print(f'  {estado:30s} coef={model.coef_[0]:+.3f}  2025={pred_2025:.1f}  2026={pred_2026:.1f}  [{tendencia}]')

    # ── salva no banco
    cur.execute('''
        CREATE TABLE IF NOT EXISTS `previsao_mvi` (
            `id`           INT AUTO_INCREMENT PRIMARY KEY,
            `estado`       VARCHAR(60),
            `coef_angular` FLOAT,
            `intercepto`   FLOAT,
            `r2`           FLOAT,
            `prev_2025`    FLOAT,
            `prev_2026`    FLOAT,
            `tendencia`    VARCHAR(10),
            `mvi_2022`     FLOAT,
            `mvi_2023`     FLOAT,
            `mvi_2024`     FLOAT
        )
    ''')
    cur.execute('DELETE FROM `previsao_mvi`')

    for r in resultados:
        cur.execute('''
            INSERT INTO previsao_mvi
              (estado, coef_angular, intercepto, r2, prev_2025, prev_2026, tendencia, mvi_2022, mvi_2023, mvi_2024)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (
            r['estado'], r['coef_angular'], r['intercepto'], r['r2'],
            r['prev_2025'], r['prev_2026'], r['tendencia'],
            r['mvi_2022'], r['mvi_2023'], r['mvi_2024'],
        ))

    conn.commit()
    print(f'  → {len(resultados)} estados salvos em previsao_mvi.')




def correlacao_pearson(cur, conn):
    print('\n[2/3] Correlação de Pearson — Investimento × MVI ...')

    mvi      = carregar_tabela(cur, 'mvi_taxa')
    policia  = carregar_tabela(cur, 'policiamento')
    defesa   = carregar_tabela(cur, 'defesa_civil')
    intelig  = carregar_tabela(cur, 'informacoes_e_inteligencia')
    demais   = carregar_tabela(cur, 'demais_servicos')

    anos = [2022, 2023, 2024]
    resultados = []

    estados = sorted(mvi.keys())
    for estado in estados:
        mvi_vals = [mvi[estado].get(a) for a in anos]
        pol_vals = [policia.get(estado, {}).get(a) for a in anos]
        def_vals = [defesa.get(estado, {}).get(a) for a in anos]
        int_vals = [intelig.get(estado, {}).get(a) for a in anos]
        dem_vals = [demais.get(estado, {}).get(a) for a in anos]

        # investimento total por ano
        invest_vals = []
        for i in range(3):
            vs = [pol_vals[i], def_vals[i], int_vals[i], dem_vals[i]]
            vs = [v for v in vs if v is not None]
            invest_vals.append(sum(vs) if vs else None)

        # filtra pares onde ambos existem
        pares = [(m, iv) for m, iv in zip(mvi_vals, invest_vals) if m is not None and iv is not None]
        if len(pares) < 2:
            print(f'  {estado}: pares insuficientes, pulando.')
            continue

        ys = [p[0] for p in pares]
        xs = [p[1] for p in pares]

        if len(pares) == 2:
            # com 2 pontos pearsonr não computa p-value útil; calcula manualmente
            r = np.corrcoef(xs, ys)[0, 1]
            p = None
        else:
            r, p = pearsonr(xs, ys)
            r = float(r)
            p = float(p)

        # interpretação
        if abs(r) >= 0.7:
            forca = 'forte'
        elif abs(r) >= 0.4:
            forca = 'moderada'
        else:
            forca = 'fraca'
        direcao = 'positiva' if r > 0 else 'negativa'

        # investimento total médio (para o scatter do dashboard)
        invest_medio = float(np.mean(xs))
        mvi_medio = float(np.mean(ys))

        resultados.append({
            'estado': estado,
            'pearson_r': round(r, 4),
            'p_value': round(p, 4) if p is not None else None,
            'forca': forca,
            'direcao': direcao,
            'invest_medio': round(invest_medio, 2),
            'mvi_medio': round(mvi_medio, 4),
        })
        sig = f'p={p:.3f}' if p is not None else 'p=N/A'
        print(f'  {estado:30s} r={r:+.3f}  {sig}  {direcao} {forca}')

    # ── salva no banco
    cur.execute('''
        CREATE TABLE IF NOT EXISTS `correlacao_estados` (
            `id`           INT AUTO_INCREMENT PRIMARY KEY,
            `estado`       VARCHAR(60),
            `pearson_r`    FLOAT,
            `p_value`      FLOAT,
            `forca`        VARCHAR(20),
            `direcao`      VARCHAR(20),
            `invest_medio` FLOAT,
            `mvi_medio`    FLOAT
        )
    ''')
    cur.execute('DELETE FROM `correlacao_estados`')

    for r in resultados:
        cur.execute('''
            INSERT INTO correlacao_estados
              (estado, pearson_r, p_value, forca, direcao, invest_medio, mvi_medio)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        ''', (
            r['estado'], r['pearson_r'], r['p_value'],
            r['forca'], r['direcao'], r['invest_medio'], r['mvi_medio'],
        ))

    conn.commit()
    print(f'  → {len(resultados)} estados salvos em correlacao_estados.')




def ranking_eficiencia(cur, conn):
    print('\n[3/3] Ranking de Eficiência de Investimento ...')

    mvi     = carregar_tabela(cur, 'mvi_taxa')
    policia = carregar_tabela(cur, 'policiamento')
    defesa  = carregar_tabela(cur, 'defesa_civil')
    intelig = carregar_tabela(cur, 'informacoes_e_inteligencia')
    demais  = carregar_tabela(cur, 'demais_servicos')

    estados = sorted(mvi.keys())
    resultados = []

    for estado in estados:
        mvi22 = mvi[estado].get(2022)
        mvi24 = mvi[estado].get(2024)

        pol = {a: policia.get(estado, {}).get(a) for a in [2022, 2023, 2024]}
        dfc = {a: defesa.get(estado, {}).get(a)  for a in [2022, 2023, 2024]}
        itl = {a: intelig.get(estado, {}).get(a) for a in [2022, 2023, 2024]}
        dms = {a: demais.get(estado, {}).get(a)  for a in [2022, 2023, 2024]}

        # investimento médio total (soma das 4 categorias, média dos 3 anos)
        invest_por_ano = []
        for a in [2022, 2023, 2024]:
            vs = [pol[a], dfc[a], itl[a], dms[a]]
            vs = [v for v in vs if v is not None]
            if vs:
                invest_por_ano.append(sum(vs))

        if not invest_por_ano or mvi22 is None or mvi24 is None:
            print(f'  {estado}: dados insuficientes para eficiência, pulando.')
            continue

        invest_medio = float(np.mean(invest_por_ano))

        # variação absoluta e percentual do MVI
        variacao_mvi    = mvi24 - mvi22   # negativo = queda (bom)
        variacao_pct    = (variacao_mvi / mvi22 * 100) if mvi22 != 0 else 0

        # score de eficiência: redução de MVI (por 100 mil hab.) por bilhão investido
        # quanto menor (mais negativo) melhor → usa-se -variacao_mvi / (invest_medio/1e9)
        if invest_medio > 0:
            score_eficiencia = (-variacao_mvi) / (invest_medio / 1e9)
        else:
            score_eficiencia = 0.0

        resultados.append({
            'estado': estado,
            'mvi_2022': round(mvi22, 2),
            'mvi_2024': round(mvi24, 2),
            'variacao_mvi': round(variacao_mvi, 2),
            'variacao_pct': round(variacao_pct, 2),
            'invest_medio_bi': round(invest_medio / 1e9, 4),
            'score_eficiencia': round(score_eficiencia, 4),
        })

    # ordena do mais eficiente (maior score) para o menos
    resultados.sort(key=lambda x: x['score_eficiencia'], reverse=True)

    for i, r in enumerate(resultados, 1):
        print(f'  {i:2d}. {r["estado"]:30s} score={r["score_eficiencia"]:+.2f}  ΔMVI={r["variacao_mvi"]:+.2f}  inv={r["invest_medio_bi"]:.2f}B')

    # ── salva no banco
    cur.execute('''
        CREATE TABLE IF NOT EXISTS `eficiencia_estados` (
            `id`               INT AUTO_INCREMENT PRIMARY KEY,
            `ranking`          INT,
            `estado`           VARCHAR(60),
            `mvi_2022`         FLOAT,
            `mvi_2024`         FLOAT,
            `variacao_mvi`     FLOAT,
            `variacao_pct`     FLOAT,
            `invest_medio_bi`  FLOAT,
            `score_eficiencia` FLOAT
        )
    ''')
    cur.execute('DELETE FROM `eficiencia_estados`')

    for i, r in enumerate(resultados, 1):
        cur.execute('''
            INSERT INTO eficiencia_estados
              (ranking, estado, mvi_2022, mvi_2024, variacao_mvi, variacao_pct, invest_medio_bi, score_eficiencia)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (
            i, r['estado'], r['mvi_2022'], r['mvi_2024'],
            r['variacao_mvi'], r['variacao_pct'],
            r['invest_medio_bi'], r['score_eficiencia'],
        ))

    conn.commit()
    print(f'  → {len(resultados)} estados salvos em eficiencia_estados.')




def main():
    print('=== Análise ML — Segurança Pública ===')
    conn = mysql.connector.connect(**DB)
    cur  = conn.cursor()

    regressao_linear(cur, conn)
    correlacao_pearson(cur, conn)
    ranking_eficiencia(cur, conn)

    cur.close()
    conn.close()
    print('\n✓ Concluído. Tabelas criadas: previsao_mvi, correlacao_estados, eficiencia_estados.')


if __name__ == '__main__':
    main()