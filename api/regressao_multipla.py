
import pandas as pd
import statsmodels.api as sm
import warnings
warnings.filterwarnings('ignore')

from db import get_connection


def limpar_numero(valor):
    if valor is None or valor == '' or valor == '-':
        return None
    v = str(valor).strip().replace('.', '').replace(',', '.')
    try:
        return float(v)
    except Exception:
        return None


def carregar_tabela(cur, tabela):
    cur.execute(f'SELECT estado, ano2022, ano2023, ano2024 FROM {tabela}')
    rows = cur.fetchall()
    result = {}
    for estado, a2022, a2023, a2024 in rows:
        result[estado] = {
            2022: limpar_numero(a2022),
            2023: limpar_numero(a2023),
            2024: limpar_numero(a2024),
        }
    return result


def interpretar_coef(nome, coef, pvalue):
    sig = pvalue < 0.05 if pvalue is not None else False
    direcao = 'redução' if coef < 0 else 'aumento'
    mag = abs(coef)

    if not sig:
        return f'Sem efeito estatisticamente significativo (p={pvalue:.3f})' if pvalue is not None else 'p-value indisponível'

    return (
        f'Aumento de R$ 1 bilhão em {nome} associado a '
        f'{direcao} de {mag:.2f} mortes por 100 mil hab. (p={pvalue:.3f})'
    )


def montar_painel(cur):
    """Retorna DataFrame com 81 linhas (27 estados × 3 anos)."""

    mvi     = carregar_tabela(cur, 'mvi_taxa')
    policia = carregar_tabela(cur, 'policiamento')
    defesa  = carregar_tabela(cur, 'defesa_civil')
    intelig = carregar_tabela(cur, 'informacoes_e_inteligencia')
    demais  = carregar_tabela(cur, 'demais_servicos')

    registros = []
    for estado in sorted(mvi.keys()):
        for ano in [2022, 2023, 2024]:
            mvi_val = mvi[estado].get(ano)
            pol_val = policia.get(estado, {}).get(ano)
            def_val = defesa.get(estado, {}).get(ano)
            int_val = intelig.get(estado, {}).get(ano)
            dem_val = demais.get(estado, {}).get(ano)

            if mvi_val is None or pol_val is None:
                continue

            registros.append({
                'estado':       estado,
                'ano':          ano,
                'mvi':          mvi_val,
                'policiamento': (pol_val or 0) / 1e9,
                'defesa_civil': (def_val or 0) / 1e9,
                'inteligencia': (int_val or 0) / 1e9,
                'demais':       (dem_val or 0) / 1e9,
            })

    df = pd.DataFrame(registros)
    print(f'  Painel montado: {len(df)} observações ({df["estado"].nunique()} estados × anos)')
    return df


def rodar_ols(df, variaveis, nome_modelo, descricao):
    y = df['mvi']
    X = sm.add_constant(df[variaveis])
    modelo = sm.OLS(y, X).fit()

    r2     = float(modelo.rsquared)
    r2_adj = float(modelo.rsquared_adj)
    f_stat = float(modelo.fvalue)
    f_pval = float(modelo.f_pvalue)
    n_obs  = int(modelo.nobs)

    print(f'\n  Modelo: {nome_modelo}')
    print(f'  R²={r2:.4f}  R²adj={r2_adj:.4f}  F={f_stat:.3f}  p={f_pval:.4f}  n={n_obs}')

    coefs = []
    for var in X.columns:
        c     = float(modelo.params[var])
        se    = float(modelo.bse[var])
        tstat = float(modelo.tvalues[var])
        pval  = float(modelo.pvalues[var])
        interp = interpretar_coef(var, c, pval) if var != 'const' else 'Intercepto do modelo'

        coefs.append({
            'modelo':        nome_modelo,
            'variavel':      var,
            'coeficiente':   round(c, 6),
            'erro_padrao':   round(se, 6),
            't_stat':        round(tstat, 4),
            'p_value':       round(pval, 4),
            'significativo': pval < 0.05,
            'interpretacao': interp,
        })
        sig_mark = '***' if pval < 0.01 else ('**' if pval < 0.05 else ('.' if pval < 0.1 else ''))
        print(f'    {var:30s} coef={c:+.4f}  p={pval:.4f} {sig_mark}')

    return {
        'nome':          nome_modelo,
        'descricao':     descricao,
        'variaveis':     ', '.join(variaveis),
        'r2':            round(r2, 4),
        'r2_adj':        round(r2_adj, 4),
        'f_stat':        round(f_stat, 4),
        'f_pvalue':      round(f_pval, 4),
        'n_obs':         n_obs,
        'significativo': f_pval < 0.05,
    }, coefs


def main():
    print('=== Regressão Múltipla — Segurança Pública (PostgreSQL/Neon) ===')
    conn = get_connection()
    cur = conn.cursor()

    df = montar_painel(cur)

    modelos_def = [
        (
            'Modelo Completo',
            ['policiamento', 'defesa_civil', 'inteligencia', 'demais'],
            'MVI ~ Policiamento + Defesa Civil + Inteligência + Demais Serviços',
        ),
        (
            'Modelo Policiamento',
            ['policiamento'],
            'MVI ~ Policiamento (modelo simples)',
        ),
        (
            'Modelo Segurança Esp.',
            ['defesa_civil', 'inteligencia'],
            'MVI ~ Defesa Civil + Informações e Inteligência',
        ),
    ]

    todos_modelos = []
    todos_coefs = []

    for nome, variaveis, descricao in modelos_def:
        resumo, coefs = rodar_ols(df, variaveis, nome, descricao)
        todos_modelos.append(resumo)
        todos_coefs.extend(coefs)

    cur.execute('''
        CREATE TABLE IF NOT EXISTS regressao_modelo (
            id             SERIAL PRIMARY KEY,
            nome           VARCHAR(60),
            descricao      VARCHAR(200),
            variaveis      VARCHAR(200),
            r2             DOUBLE PRECISION,
            r2_adj         DOUBLE PRECISION,
            f_stat         DOUBLE PRECISION,
            f_pvalue       DOUBLE PRECISION,
            n_obs          INT,
            significativo  BOOLEAN
        )
    ''')
    cur.execute('DELETE FROM regressao_modelo')
    for m in todos_modelos:
        cur.execute('''
            INSERT INTO regressao_modelo
              (nome, descricao, variaveis, r2, r2_adj, f_stat, f_pvalue, n_obs, significativo)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (
            m['nome'], m['descricao'], m['variaveis'],
            m['r2'], m['r2_adj'], m['f_stat'], m['f_pvalue'],
            m['n_obs'], bool(m['significativo']),
        ))

    cur.execute('''
        CREATE TABLE IF NOT EXISTS regressao_coeficientes (
            id             SERIAL PRIMARY KEY,
            modelo         VARCHAR(60),
            variavel       VARCHAR(60),
            coeficiente    DOUBLE PRECISION,
            erro_padrao    DOUBLE PRECISION,
            t_stat         DOUBLE PRECISION,
            p_value        DOUBLE PRECISION,
            significativo  BOOLEAN,
            interpretacao  VARCHAR(300)
        )
    ''')
    cur.execute('DELETE FROM regressao_coeficientes')
    for c in todos_coefs:
        cur.execute('''
            INSERT INTO regressao_coeficientes
              (modelo, variavel, coeficiente, erro_padrao, t_stat, p_value, significativo, interpretacao)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (
            c['modelo'], c['variavel'], c['coeficiente'], c['erro_padrao'],
            c['t_stat'], c['p_value'], bool(c['significativo']), c['interpretacao'],
        ))

    conn.commit()
    cur.close()
    conn.close()
    print('\n✓ Concluído. Tabelas atualizadas: regressao_modelo, regressao_coeficientes.')


if __name__ == '__main__':
    main()
