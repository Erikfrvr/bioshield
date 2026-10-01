# Dia do evento: mesa de QR Codes

O plano é deixar vários QR Codes de pacientes fictícios na mesa. Quem passar escaneia com o próprio celular e vê a ficha de emergência. Este arquivo existe para que isso funcione no dia, sem surpresa.

Guia relacionado: `docs/GUIA_APK.md`.

## Como funciona, em resumo

1. O backend, o MySQL e a pasta `frontEnd/` ficam em um servidor com endereço público.
2. Cada QR Code guarda um endereço completo, que aponta para a página `emergencia.html` desse servidor, com o token do paciente no final.
3. O visitante escaneia com a câmera, o navegador abre a página, a página pede a ficha para a API e mostra na tela.
4. O visitante não instala nada e não precisa estar na mesma rede.

## A condição que decide tudo

**O servidor precisa ser acessível de fora da rede do Senac.**

Se o servidor do professor só existir na rede interna, o celular do visitante (no 4G ou na rede dos alunos) não alcança, e nenhum QR abre. Nesse caso é preciso uma hospedagem externa.

O teste que tira a dúvida: com o celular no 4G, com o wifi desligado, abrir o endereço da API no navegador. Se responder, serve.

## Perguntas para o professor

1. O servidor tem endereço público, acessível de fora da rede do Senac?
2. O endereço é fixo? Ele pode mudar entre hoje e o dia do evento?
3. Tem HTTPS?
4. Dá para rodar Node.js e MySQL nele, e publicar a pasta do front?
5. O servidor fica ligado durante todo o evento? Quem religa se cair?
6. Em qual porta a API vai responder?

## As pegadinhas

### 1. QR impresso antes da hora

O QR não guarda só o token. Ele guarda o endereço inteiro. Um QR gerado com o projeto rodando em localhost leva localhost dentro dele e nunca vai abrir no celular de outra pessoa.

**Regra:** só gerar e imprimir os QR Codes depois que o `URL_PUBLICA_EMERGENCIA` do `frontEnd/js/config.js` estiver preenchido com o endereço definitivo.

### 2. Endereço que muda depois de impresso

Se o endereço do servidor, a porta ou o caminho da página mudar depois da impressão, todos os papéis da mesa param de funcionar de uma vez.

**Regra:** confirmar com o professor que o endereço é definitivo antes de imprimir. Mudou o endereço, imprime tudo de novo.

### 3. Token que muda depois de impresso

Rotacionar, cancelar ou reativar o QR de um paciente troca ou invalida o token. O papel impresso fica com o token velho.

**Regra:** depois de imprimir, ninguém mexe no QR dos pacientes da mesa. Para demonstrar o cancelamento, separar um paciente só para isso, com o papel marcado.

Apagar um paciente e criar de novo pelo app também gera token novo. Já os três pacientes do `database/dados_ficticios.sql` têm token fixo no script, então rodar o script de novo mantém os mesmos tokens.

### 4. Rota de emergência ainda não existe

Hoje o `EmergenciaService` e o `emergenciaInfrastructure` estão prontos, mas o `emergenciaController` e o `emergenciaRoutes` ainda não. Sem eles o QR abre a página e a ficha não carrega.

**Regra:** fechar o Marco 6 do roadmap antes de qualquer teste de mesa.

### 5. Modo demonstração enganando

O `config.js` tem o campo `MODO`. Em `"demo"` ou em `"auto"` com a API fora do ar, o front mostra os dados fictícios do `demo.js` e parece que está tudo funcionando, quando na verdade não está falando com o servidor.

**Regra:** no evento, `MODO: "api"`. Assim, se o servidor cair, aparece erro de verdade e vocês ficam sabendo.

### 6. Tempo limite curto para internet de celular

O `config.js` tem `TEMPO_LIMITE_MS: 2500`. Se a API demorar mais que dois segundos e meio, o front desiste e mostra "Não consegui falar com o servidor". Em 4G fraco dentro de um prédio cheio, isso acontece.

**Regra:** aumentar esse valor para o evento. Algo como 10000 dá folga.

### 7. HTTPS misturado com HTTP

Se a página do front estiver em HTTPS e a API em HTTP, o navegador bloqueia a chamada e a ficha não carrega. O erro só aparece no console, então parece que o servidor caiu.

**Regra:** os dois em HTTPS, ou os dois em HTTP. Sem HTTPS funciona, mas o navegador pode mostrar aviso de site não seguro para o visitante.

### 8. Porta bloqueada

Algumas redes bloqueiam portas diferentes das comuns. Se a API responder na porta 3000, pode funcionar no 4G e falhar em uma rede sem fio, ou o contrário.

**Regra:** testar nos dois: 4G e a rede sem fio que os visitantes vão usar.

### 9. Servidor sem o `.env` certo

No servidor, o `.env` é outro. Sem `JWT_SECRET` o login quebra. Com os dados do banco errados, nada carrega.

**Regra:** conferir o `.env` do servidor e nunca subir esse arquivo para o Git.

### 10. Dado real na mesa

A ficha fica pública para qualquer pessoa que escanear, e o papel pode ser fotografado e levado embora.

**Regra:** só pacientes fictícios. Nenhum nome, telefone ou dado de saúde de pessoa real, nem o de vocês.

### 11. QR que a câmera não lê

QR pequeno demais, impressão clara, papel plastificado com reflexo ou dobrado no meio do código.

**Regra:** imprimir grande, em papel fosco, e testar cada papel com dois celulares diferentes.

## O que ajustar no projeto

No `frontEnd/js/config.js` que vai para o servidor:

1. `URL_API`: endereço público da API.
2. `URL_PUBLICA_EMERGENCIA`: endereço público da página `emergencia.html`.
3. `MODO`: `"api"`.
4. `TEMPO_LIMITE_MS`: valor maior, para internet de celular.

No servidor:

1. Banco criado com o `database/bioshield.sql` e populado com o `database/dados_ficticios.sql`.
2. `.env` do backend preenchido.
3. Backend rodando e pasta `frontEnd/` publicada.

## Linha do tempo

### Antes de tudo

1. Fazer as perguntas ao professor.
2. Terminar o controller e a rota de emergência.

### Uma semana antes

1. Subir backend, banco e front no servidor.
2. Ajustar o `config.js` com os endereços definitivos.
3. Com o celular no 4G, abrir a ficha de um paciente pelo endereço completo.
4. Decidir quantos pacientes vão para a mesa e qual deles mostra o cancelamento.
5. Se precisar de mais pacientes além dos três do script, criar agora.

### Dois dias antes

1. Gerar os QR Codes pelo app já apontando para o servidor.
2. Imprimir.
3. Testar cada papel com dois celulares, um no 4G e um na rede sem fio.
4. A partir daqui, ninguém rotaciona, cancela ou recria paciente da mesa.

### Na véspera

1. Escanear todos os papéis de novo.
2. Conferir que a leitura aparece na tabela `acessos_qr`.
3. Preparar o plano B.

### No dia, antes de abrir a mesa

1. Servidor ligado e API respondendo.
2. Escanear um papel com o celular no 4G.
3. Escanear o papel do paciente cancelado e ver a tela de aviso.
4. Notebook com o plano B aberto.

## Plano B

Se o servidor cair no meio do evento:

1. **Vídeo gravado** do fluxo completo, que já está previsto na Fase 12 do roadmap.
2. **Modo demonstração no notebook:** abrir o front com `MODO: "demo"` e mostrar as telas com os dados do `demo.js`. Não depende de servidor nem de internet.
3. **Prints da ficha de emergência** impressos, para mostrar o que o visitante veria.

## Um ponto forte para mostrar

Cada leitura do QR fica registrada em `acessos_qr`, com data, hora e o aparelho. Quando a rota de histórico de acessos estiver pronta, dá para mostrar ao visitante, na tela do paciente, que a leitura dele acabou de aparecer. É a parte da LGPD funcionando ao vivo.

## Quem confere o quê

Sugestão, ajustem como preferirem.

**Erik:** servidor, `config.js`, rota de emergência, geração e impressão dos QR Codes.

**Daiane:** banco no servidor com os dados fictícios, teste de cada papel com dois celulares, plano B.

**Juntos:** a conferência da véspera e a do dia.
