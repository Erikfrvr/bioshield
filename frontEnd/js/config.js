// Configuracao do front. Vale para o site e para o app Android, que usam estes mesmos arquivos.
//
// SERVIDOR e o endereco do computador que roda o backend, sem o /api no fim.
// Vazio, o front descobre sozinho, nesta ordem (a conta fica no api.js):
//   1. o endereco que a pessoa salvou na tela de entrada, no botao "Servidor"
//   2. o endereco da propria pagina, quando quem entrega as telas e o backend
//   3. http://localhost:3000, que e o backend rodando neste mesmo computador
// Preencha so se quiser travar um endereco. Exemplos: "https://bioshield.tail1234ab.ts.net" (Tailscale Funnel)
// ou "http://192.168.0.10:3000" (rede local). Endereco terminado em .ts.net vira sempre https, sem porta.
//
// MODO aceita "auto", "api" e "demo". Em "auto" o front usa a API e cai pro modo demonstracao
// se nenhum servidor responder. Em "api" nunca cai na demonstracao. Em "demo" nem procura servidor.
//
// URL_PUBLICA_EMERGENCIA e o endereco da pagina emergencia.html que vai dentro do QR Code.
// Vazio, o front monta sozinho a partir do servidor. Preencha so se a ficha publica morar em outro lugar.
//
// SERVIDOR_SUGERIDO e o endereco que ja vem escrito no quadro Servidor da tela de entrada.
// No app, enquanto nenhum servidor foi salvo, o quadro abre sozinho no topo da tela com esse endereco,
// e a pessoa so confere e toca em "Testar e salvar". Ele nao conecta sozinho e nao trava nada:
// diferente do SERVIDOR, o site continua achando o proprio backend. Vazio, o campo vem em branco.

window.BioShieldConfig = {
  SERVIDOR: "",
  SERVIDOR_SUGERIDO: "bioshield.bonito-tench.ts.net",
  MODO: "auto",
  // Quanto tempo esperar uma resposta normal da API antes de desistir.
  TEMPO_LIMITE_MS: 8000,
  // Quanto tempo esperar cada servidor candidato dizer que esta vivo, na hora de descobrir o endereco.
  TEMPO_DA_SONDA_MS: 2500,
  URL_PUBLICA_EMERGENCIA: ""
};
