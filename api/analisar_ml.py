import numpy as np
from sklearn.linear_model import LinearRegression
from scipy.stats import pearsonr
import warnings
warnings.filterwarnings('ignore')

from db import get_connection

ANOS_DISPONIVEIS = list(range(2016, 2026))   # 2016 a 2025
ANOS_TREINO       = list(range(2016, 2025))  # 2016 a 2024 (usados para treinar a regressão)
ANO_INICIAL_EFIC  = 2016
ANO_FINAL_EFIC    = 2025


def limpar_numero(valor):
    if valor is None or valor == '' or valor == '-':
        return None
    v = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(v)
    except Exception:
        return None


def colunas_ano_existentes(cur, tabela):
    """Retorna os anos (int) que realmente existem como coluna ano<ano> na tabela."""
    cur.execute('''
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND column_name ~ '^ano[0-9]{4}$'
    ''', (tabela,))
    return sorted(int(row[0][3:]) for row in cur.fetchall())


def carregar_tabela(cur, tabela):
    """Retorna dict {estado: {ano: valor}} apenas para os anos que existem na tabela."""
    anos_tabela = colunas_ano_existentes(cur, tabela)
    if not anos_tabela:
        return {}
    colunas = ', '.join(f'ano{a}' for a in anos_tabela)
    cur.execute(f'SELECT estado, {colunas} FROM {tabela}')
    rows = cur.fetchall()
    result = {}
    for row in rows:
        estado = row[0]
        valores = row[1:]
        result[estado] = {ano: limpar_numero(v) for ano, v in zip(anos_tabela, valores)}
    return result


def regressao_linear(cur, conn):
    print('\n[1/3] Regressão Linear — Previsão de MVI (taxa) ...')

    dados = carregar_tabela(cur, 'mvi_taxa')
    resultados = []

    for estado, anos in dados.items():
        validos = [(a, anos[a]) for a in ANOS_TREINO if anos.get(a) is not None]
        if len(validos) < 2:
            print(f'  {estado}: dados insuficientes, pulando.')
            continue

        xs = np.array([a for a, _ in validos]).reshape(-1, 1)
        ys = np.array([v for _, v in validos])

        model = LinearRegression()
        model.fit(xs, ys)

        pred_2025 = max(0.0, float(model.predict([[2025]])[0]))
        pred_2026 = max(0.0, float(model.predict([[2026]])[0]))

        r2 = float(model.score(xs, ys)) if len(validos) >= 3 else None
        tendencia = 'queda' if model.coef_[0] < 0 else 'alta'

        resultados.append({
            'estado': estado,
            'coef_angular': round(float(model.coef_[0]), 4),
            'intercepto': round(float(model.intercept_), 4),
            'r2': round(r2, 4) if r2 is not None else None,
            'prev_2025': round(pred_2025, 2),
            'prev_2026': round(pred_2026, 2),
            'tendencia': tendencia,
            'mvi_2022': anos.get(2022),
            'mvi_2023': anos.get(2023),
            'mvi_2024': anos.get(2024),
        })
        print(f'  {estado:30s} n={len(validos)}  coef={model.coef_[0]:+.3f}  2025={pred_2025:.1f}  2026={pred_2026:.1f}  [{tendencia}]')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS previsao_mvi (
            id           SERIAL PRIMARY KEY,
            estado       VARCHAR(60),
            coef_angular DOUBLE PRECISION,
            intercepto   DOUBLE PRECISION,
            r2           DOUBLE PRECISION,
            prev_2025    DOUBLE PRECISION,
            prev_2026    DOUBLE PRECISION,
            tendencia    VARCHAR(10),
            mvi_2022     DOUBLE PRECISION,
            mvi_2023     DOUBLE PRECISION,
            mvi_2024     DOUBLE PRECISION
        )
    ''')
    cur.execute('DELETE FROM previsao_mvi')

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

    resultados = []
    estados = sorted(mvi.keys())
    for estado in estados:
        mvi_vals = [mvi[estado].get(a) for a in ANOS_DISPONIVEIS]
        pol_vals = [policia.get(estado, {}).get(a) for a in ANOS_DISPONIVEIS]
        def_vals = [defesa.get(estado, {}).get(a) for a in ANOS_DISPONIVEIS]
        int_vals = [intelig.get(estado, {}).get(a) for a in ANOS_DISPONIVEIS]
        dem_vals = [demais.get(estado, {}).get(a) for a in ANOS_DISPONIVEIS]

        invest_vals = []
        for i in range(len(ANOS_DISPONIVEIS)):
            vs = [pol_vals[i], def_vals[i], int_vals[i], dem_vals[i]]
            vs = [v for v in vs if v is not None]
            invest_vals.append(sum(vs) if vs else None)

        pares = [(m, iv) for m, iv in zip(mvi_vals, invest_vals) if m is not None and iv is not None]
        if len(pares) < 2:
            print(f'  {estado}: pares insuficientes, pulando.')
            continue

        ys = [p[0] for p in pares]
        xs = [p[1] for p in pares]

        if len(pares) == 2:
            r = np.corrcoef(xs, ys)[0, 1]
            p = None
        else:
            r, p = pearsonr(xs, ys)
            r = float(r)
            p = float(p)

        if abs(r) >= 0.7:
            forca = 'forte'
        elif abs(r) >= 0.4:
            forca = 'moderada'
        else:
            forca = 'fraca'
        direcao = 'positiva' if r > 0 else 'negativa'

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
        print(f'  {estado:30s} n={len(pares)}  r={r:+.3f}  {sig}  {direcao} {forca}')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS correlacao_estados (
            id           SERIAL PRIMARY KEY,
            estado       VARCHAR(60),
            pearson_r    DOUBLE PRECISION,
            p_value      DOUBLE PRECISION,
            forca        VARCHAR(20),
            direcao      VARCHAR(20),
            invest_medio DOUBLE PRECISION,
            mvi_medio    DOUBLE PRECISION
        )
    ''')
    cur.execute('DELETE FROM correlacao_estados')

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
    print(f'\n[3/3] Ranking de Eficiência de Investimento ({ANO_INICIAL_EFIC} -> {ANO_FINAL_EFIC}) ...')

    mvi     = carregar_tabela(cur, 'mvi_taxa')
    policia = carregar_tabela(cur, 'policiamento')
    defesa  = carregar_tabela(cur, 'defesa_civil')
    intelig = carregar_tabela(cur, 'informacoes_e_inteligencia')
    demais  = carregar_tabela(cur, 'demais_servicos')

    estados = sorted(mvi.keys())
    resultados = []

    for estado in estados:
        mvi_ini = mvi[estado].get(ANO_INICIAL_EFIC)
        mvi_fim = mvi[estado].get(ANO_FINAL_EFIC)

        if mvi_ini is None or mvi_fim is None:
            print(f'  {estado}: sem MVI em {ANO_INICIAL_EFIC} ou {ANO_FINAL_EFIC}, pulando.')
            continue

        invest_por_ano = []
        for a in ANOS_DISPONIVEIS:
            vs = [
                policia.get(estado, {}).get(a),
                defesa.get(estado, {}).get(a),
                intelig.get(estado, {}).get(a),
                demais.get(estado, {}).get(a),
            ]
            vs = [v for v in vs if v is not None]
            if vs:
                invest_por_ano.append(sum(vs))

        if not invest_por_ano:
            print(f'  {estado}: sem dados de investimento, pulando.')
            continue

        invest_medio = float(np.mean(invest_por_ano))

        variacao_mvi = mvi_fim - mvi_ini
        variacao_pct = (variacao_mvi / mvi_ini * 100) if mvi_ini != 0 else 0

        if invest_medio > 0:
            score_eficiencia = (-variacao_mvi) / (invest_medio / 1e9)
        else:
            score_eficiencia = 0.0

        resultados.append({
            'estado': estado,
            'mvi_inicial': round(mvi_ini, 2),
            'mvi_final': round(mvi_fim, 2),
            'ano_inicial': ANO_INICIAL_EFIC,
            'ano_final': ANO_FINAL_EFIC,
            'variacao_mvi': round(variacao_mvi, 2),
            'variacao_pct': round(variacao_pct, 2),
            'invest_medio_bi': round(invest_medio / 1e9, 4),
            'score_eficiencia': round(score_eficiencia, 4),
        })

    resultados.sort(key=lambda x: x['score_eficiencia'], reverse=True)

    for i, r in enumerate(resultados, 1):
        print(f'  {i:2d}. {r["estado"]:30s} score={r["score_eficiencia"]:+.2f}  ΔMVI={r["variacao_mvi"]:+.2f}  inv={r["invest_medio_bi"]:.2f}B')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS eficiencia_estados (
            id               SERIAL PRIMARY KEY,
            ranking          INT,
            estado           VARCHAR(60),
            mvi_inicial      DOUBLE PRECISION,
            mvi_final        DOUBLE PRECISION,
            ano_inicial      INT,
            ano_final        INT,
            variacao_mvi     DOUBLE PRECISION,
            variacao_pct     DOUBLE PRECISION,
            invest_medio_bi  DOUBLE PRECISION,
            score_eficiencia DOUBLE PRECISION
        )
    ''')
    cur.execute('DELETE FROM eficiencia_estados')

    for i, r in enumerate(resultados, 1):
        cur.execute('''
            INSERT INTO eficiencia_estados
              (ranking, estado, mvi_inicial, mvi_final, ano_inicial, ano_final, variacao_mvi, variacao_pct, invest_medio_bi, score_eficiencia)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (
            i, r['estado'], r['mvi_inicial'], r['mvi_final'],
            r['ano_inicial'], r['ano_final'],
            r['variacao_mvi'], r['variacao_pct'],
            r['invest_medio_bi'], r['score_eficiencia'],
        ))

    conn.commit()
    print(f'  → {len(resultados)} estados salvos em eficiencia_estados.')


def main():
    print('=== Análise ML — Segurança Pública (PostgreSQL/Neon) ===')
    conn = get_connection()
    cur = conn.cursor()

    regressao_linear(cur, conn)
    correlacao_pearson(cur, conn)
    ranking_eficiencia(cur, conn)

    cur.close()
    conn.close()
    print('\n✓ Concluído. Tabelas atualizadas: previsao_mvi, correlacao_estados, eficiencia_estados.')


if __name__ == '__main__':
    main()