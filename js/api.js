// funcoes para interagir com a api do Portal da Transparência

class APIHandler {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.apiKey = CONFIG.API_KEY;
    }

    // func buscar dados de investimento em segurança pública
    async getSecurityInvestment(year = 2024) {
        try {
            const url = `${this.baseURL}/funcao/06?ano=${year}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'chave-api-dados': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();
            console.log('Dados recebidos da API:', data);
            return data;

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            return null;
        }
    }

    // func formatar valores monetários
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // func formatar datas
    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    }
}

// instancia global da API
const api = new APIHandler();