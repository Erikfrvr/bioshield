// Conexao com o MySQL.
// Crio o pool aqui lendo as variaveis do .env e testo a conexao assim que o servidor sobe,
// pra eu descobrir na hora se o banco nao respondeu em vez de quebrar na primeira query.
// Todo mundo que precisa do banco importa esse pool, ninguem abre conexao por conta propria.
