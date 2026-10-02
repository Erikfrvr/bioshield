# Dia do evento: mesa de QR Codes

O plano é deixar vários QR Codes de pacientes fictícios na mesa. Quem passar escaneia com o próprio celular e vê a ficha de emergência. Este arquivo existe para que isso funcione no dia, sem surpresa.

Guia relacionado: `docs/GUIA_APK.md`.

## Decisão tomada

O BioShield vai rodar em um computador com Linux Mint, ligado pelo professor a um roteador. **Para o QR abrir, o celular do visitante precisa estar conectado no wifi desse roteador.** No 4G não abre.

Escolhemos esse caminho porque é o mais simples: não tem custo, não precisa de hospedagem externa e fica tudo em um lugar só. O preço é um passo a mais para o visitante, que precisa entrar no wifi antes de escanear.

Como subir o servidor está em `docs/SERVIDOR_LINUX.md`.

## Como funciona, em resumo

1. O backend e o MySQL ficam no servidor. O backend entrega também as telas, tudo na porta 3000.
2. Cada QR Code guarda um endereço completo, que aponta para a página `emergencia.html` desse servidor, com o token do paciente no final.
3. O visitante conecta no wifi do roteador.
4. Ele escaneia com a câmera, o navegador abre a página, a página pede a ficha para a API e mostra na tela.
5. O visitante não instala nada.

## A condição que decide tudo

**O celular conectado no wifi do roteador precisa conseguir abrir o servidor.**

O teste que tira a dúvida: conectar o celular no wifi e abrir no navegador o endereço que o terminal do servidor mostra na subida, por exemplo `http://192.168.0.10:3000`. Se abrir, o plano funciona. Se não abrir, nenhum QR vai abrir: confira a lista "Se o celular não abrir" do `docs/SERVIDOR_LINUX.md`.

## Perguntas para o professor

1. O roteador vai ser o mesmo no dia do evento? Trocar de roteador troca o endereço, e os QR impressos param de abrir.
2. Dá para fixar o IP do servidor no roteador, para ele não mudar de um dia para o outro?
3. Qual é o nome e a senha do wifi do roteador? O visitante vai precisar dos dois.
4. Quantos aparelhos o roteador aguenta ao mesmo tempo?
5. O roteador tem isolamento entre os aparelhos do wifi? Se tiver, precisa estar desligado.
6. O servidor fica ligado durante todo o evento?

As perguntas 1 e 2 são as mais importantes. O QR Code guarda o endereço do servidor, então ele só pode ser impresso depois que esse endereço estiver decidido.

## O que colocar na mesa

1. **Uma placa bem visível** com o passo a passo: "1. Conecte no wifi (nome da rede). 2. Senha: (a senha). 3. Aponte a câmera para o QR Code."
2. **Um celular de vocês já conectado,** para emprestar a quem não quiser ou não conseguir entrar no wifi. É o que salva a demonstração quando o visitante está com pressa.
3. **Os QR Codes dos pacientes,** com um deles marcado como o do QR cancelado.

Se o wifi usar só senha, dá para imprimir também um QR Code de wifi, que conecta o celular na rede ao ser escaneado. Vários geradores gratuitos fazem isso. Aí o visitante escaneia dois códigos e não digita nada.

## As pegadinhas

### 1. QR impresso antes da hora

O QR não guarda só o token. Ele guarda o endereço inteiro. Um QR gerado com o projeto rodando em localhost leva localhost dentro dele e nunca vai abrir no celular de outra pessoa.

O projeto já se protege disso: o servidor informa o endereço de rede dele e o front usa esse endereço no QR, mesmo com a tela aberta por `localhost`. Se ainda assim o endereço for local, a tela da ficha mostra um aviso em vermelho embaixo do QR.

**Regra:** antes de imprimir, ler o endereço que aparece embaixo do QR Code na tela da ficha. Ele tem que começar com o IP do servidor, o mesmo que o terminal mostra.

### 2. Endereço que muda depois de impresso

Se o endereço do servidor, a porta ou o caminho da página mudar depois da impressão, todos os papéis da mesa param de funcionar de uma vez. Em rede interna isso acontece quando o servidor é reiniciado e recebe outro endereço.

**Regra:** confirmar com o professor que o endereço é fixo antes de imprimir. Mudou o endereço, imprime tudo de novo.

### 3. Token que muda depois de impresso

Rotacionar, cancelar ou reativar o QR de um paciente troca ou invalida o token. O papel impresso fica com o token velho.

**Regra:** depois de imprimir, ninguém mexe no QR dos pacientes da mesa. Para demonstrar o cancelamento, separar um paciente só para isso, com o papel marcado.

Apagar um paciente e criar de novo pelo app também gera token novo. Já os três pacientes do `database/dados_ficticios.sql` têm token fixo no script, então rodar o script de novo mantém os mesmos tokens.

### 4. Visitante no 4G

É a pegadinha nova deste plano. O visitante escaneia sem conectar no wifi, a página não abre e ele acha que o projeto não funciona.

**Regra:** a placa do wifi fica na frente dos QR Codes, não ao lado. E quem estiver na mesa avisa antes de a pessoa apontar a câmera.

### 5. Wifi que não aceita visitante

Se a rede pedir login de aluno, ou se cair com muita gente conectada, o visitante não entra.

**Regra:** confirmar com o professor como o visitante entra no wifi, e deixar o celular de vocês pronto para emprestar.

### 6. Modo demonstração enganando

O `config.js` tem o campo `MODO`. Em `"demo"` ou em `"auto"` com a API fora do ar, o front mostra os dados fictícios do `demo.js` e parece que está tudo funcionando, quando na verdade não está falando com o servidor.

O risco diminuiu: quem escaneia um QR nunca vê dado fictício, e quem está logado em uma conta de verdade também não. Sem servidor, aparece o aviso de erro. A demonstração só aparece para quem abre a tela de entrada sem servidor nenhum respondendo.

**Regra:** no evento, olhar a tela de entrada antes de abrir a mesa. Se aparecer o quadro "Modo demonstração", o servidor não está respondendo.

### 7. Tempo limite curto

O `config.js` tem `TEMPO_LIMITE_MS`, que é quanto o front espera uma resposta antes de mostrar "Não consegui falar com o servidor". Ele já está em 8000, oito segundos.

**Regra:** se no teste com o wifi cheio aparecer esse erro, aumentar o valor.

### 8. HTTPS misturado com HTTP

Se a página do front estiver em HTTPS e a API em HTTP, o navegador bloqueia a chamada e a ficha não carrega. O erro só aparece no console, então parece que o servidor caiu.

**Regra:** os dois em HTTPS, ou os dois em HTTP. Em servidor interno o normal é os dois em HTTP. Funciona, mas o navegador pode mostrar aviso de site não seguro para o visitante.

### 9. Porta bloqueada no wifi

Algumas redes bloqueiam portas diferentes das comuns. Se a API responder na porta 3000, pode funcionar no computador por cabo e falhar no wifi do roteador.

**Regra:** testar pelo celular no wifi do roteador, não só pelo computador.

### 10. Servidor sem o `.env` certo

No servidor, o `.env` é outro. Sem `JWT_SECRET` o login quebra. Com os dados do banco errados, nada carrega.

**Regra:** conferir o `.env` do servidor e nunca subir esse arquivo para o Git.

### 11. Dado real na mesa

A ficha fica aberta para qualquer pessoa que escanear, e o papel pode ser fotografado e levado embora.

**Regra:** só pacientes fictícios. Nenhum nome, telefone ou dado de saúde de pessoa real, nem o de vocês.

### 12. QR que a câmera não lê

QR pequeno demais, impressão clara, papel plastificado com reflexo ou dobrado no meio do código.

**Regra:** imprimir grande, em papel fosco, e testar cada papel com dois celulares diferentes.

## O que ajustar no projeto

No `frontEnd/js/config.js` não precisa mexer em nada. O front acha o servidor sozinho e monta o endereço do QR a partir dele.

No servidor, seguindo o `docs/SERVIDOR_LINUX.md`:

1. Banco criado com o `database/bioshield.sql` e populado com o `database/dados_ficticios.sql`.
2. `.env` do backend preenchido.
3. IP do servidor fixado no roteador.
4. Backend rodando com `npm start`. Ele entrega as telas junto, não tem pasta para publicar à parte.

## Linha do tempo

### Antes de tudo

1. Fazer as perguntas ao professor.
2. Fazer o teste do celular no wifi do roteador abrindo o servidor.

### Uma semana antes

1. Subir backend, banco e front no servidor.
2. Ajustar o `config.js` com os endereços definitivos.
3. Com o celular no wifi do roteador, abrir a ficha de um paciente pelo endereço completo.
4. Decidir quantos pacientes vão para a mesa e qual deles mostra o cancelamento.
5. Se precisar de mais pacientes além dos três do script, criar agora.

### Dois dias antes

1. Gerar os QR Codes pelo app já apontando para o servidor.
2. Imprimir os QR Codes e a placa do wifi.
3. Testar cada papel com dois celulares diferentes, os dois no wifi do roteador.
4. A partir daqui, ninguém rotaciona, cancela ou recria paciente da mesa.

### Na véspera

1. Escanear todos os papéis de novo.
2. Conferir que a leitura aparece no histórico de acessos da ficha.
3. Preparar o plano B.

### No dia, antes de abrir a mesa

1. Servidor ligado e API respondendo.
2. Celular de empréstimo carregado e conectado no wifi.
3. Escanear um papel e ver a ficha abrir.
4. Escanear o papel do paciente cancelado e ver a tela de aviso.
5. Notebook com o plano B aberto.

## Plano B

Se o servidor ou o wifi cair no meio do evento:

1. **Vídeo gravado** do fluxo completo, que já está previsto na Fase 12 do roadmap.
2. **Modo demonstração no notebook:** abrir o front com `MODO: "demo"` e mostrar as telas com os dados do `demo.js`. Não depende de servidor nem de internet.
3. **Prints da ficha de emergência** impressos, para mostrar o que o visitante veria.

## Se um dia quiserem que abra no 4G

O caminho é hospedagem externa: a pasta `frontEnd/` em um serviço de site estático, como o Firebase Hosting, e o backend com o MySQL em um serviço que rode Node.js. O Firebase sozinho não resolve, porque não oferece MySQL. Os QR Codes teriam que ser gerados de novo, com o endereço novo.

## Um ponto forte para mostrar

Cada leitura do QR fica registrada em `acessos_qr`, com data, hora e o aparelho. A rota de histórico de acessos já existe, então dá para mostrar ao visitante, na tela do paciente, que a leitura dele acabou de aparecer. É a parte da LGPD funcionando ao vivo.

Como o servidor é interno, o IP gravado vai ser o do celular dentro da rede do roteador.

## Quem confere o quê

Sugestão, ajustem como preferirem.

**Erik:** servidor, `config.js`, geração e impressão dos QR Codes.

**Daiane:** banco no servidor com os dados fictícios, placa do wifi, teste de cada papel com dois celulares, plano B.

**Juntos:** a conferência da véspera e a do dia.
