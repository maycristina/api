// api/daily.js

export default async function handler(req, res) {
  // O link CSV que o Google Sheets gerou no Passo 1
  const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1oA597GAhJNSHhw_CVJ5HgYWDp4egmOr_lBhhOmlgTY4/export?format=csv';

  try {
    // 1. Faz o fetch dos dados na planilha
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error('Falha ao buscar dados da planilha');
    
    const csvText = await response.text();

    // 2. Lógica simples de parsing do CSV para JSON
    // (Em produção, você pode usar a biblioteca 'papaparse' para lidar com vírgulas dentro das frases)
    const rows = csvText.split('\n');
    const headers = rows[0].split(',').map(header => header.trim());
    
    const contentList = rows.slice(1).map(row => {
      // Usando regex para não quebrar colunas caso a frase tenha vírgulas
      const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
      let obj = {};
      headers.forEach((header, index) => {
        // Limpa aspas extras que o CSV pode gerar
        obj[header] = values[index] ? values[index].replace(/(^"|"$)/g, '').trim() : '';
      });
      return obj;
    });

    // 3. Pega a data atual no formato DD/MM/AAAA (Ajustado para o fuso do Brasil)
    const today = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // 4. Busca a frase do dia
    const dailyQuote = contentList.find(item => item.data_exibicao === today);

    // 5. Retorna o JSON
    if (dailyQuote) {
      res.status(200).json(dailyQuote);
    } else {
      // Fallback caso você esqueça de preencher a planilha naquele dia
      res.status(404).json({ 
        error: "Frase não encontrada para hoje.",
        fallback: contentList[0] // Retorna a primeira frase como segurança
      });
    }

  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
}
