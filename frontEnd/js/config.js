// Configuracao do front. E o unico arquivo que precisa mudar quando o backend sair do localhost.
// MODO aceita "auto", "api" e "demo". Em "auto" o front tenta a API e cai pro modo demonstracao se ela nao responder.

window.BioShieldConfig = {
  URL_API: "http://localhost:3000/api",
  MODO: "auto",
  TEMPO_LIMITE_MS: 2500,
  URL_PUBLICA_EMERGENCIA: ""
};
