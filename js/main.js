// inicialização do dashboard

// aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard iniciado!');
    console.log('Chave da API configurada:', CONFIG.API_KEY ? 'Sim ✓' : 'Não ✗');
    
    // teste inicial da api
    await testAPI();
    
    // configurar event listeners
    setupEventListeners();
});

// func para testar a conexão com a api
async function testAPI() {
    showLoading(true);
    
    try {
        console.log('Testando conexão com a API...');
        const data = await api.getSecurityInvestment(2024);
        
        if (data) {
            console.log('✓ Conexão com a API funcionando!');
            console.log('Dados recebidos:', data);
            
            // atualizar indicador
            document.getElementById('last-update').textContent = 
                new Date().toLocaleDateString('pt-BR');
        } else {
            console.error('✗ Falha ao conectar com a API');
            alert('Erro ao conectar com a API. Verifique sua chave.');
        }
    } catch (error) {
        console.error('Erro no teste da API:', error);
    } finally {
        showLoading(false);
    }
}

// configurar listeners dos filtros e botoes
function setupEventListeners() {
    // botao de atualizar
    const updateBtn = document.getElementById('update-btn');
    updateBtn.addEventListener('click', async function() {
        const year = document.getElementById('year-select').value;
        console.log('Atualizando dados para o ano:', year);
        await testAPI();
    });
    
    // filtro de regiao
    const regionSelect = document.getElementById('region-select');
    regionSelect.addEventListener('change', function() {
        console.log('Região selecionada:', this.value);
    });
    
    // tabs do ranking
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            console.log('Tab selecionada:', this.dataset.tab);
        });
    });
}

// mostrar e ocultar loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}