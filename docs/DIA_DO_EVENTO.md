# Dia do evento: a mesa de QR Codes

A ideia é deixar na mesa os QR Codes de alguns pacientes fictícios. Quem passa escaneia com o próprio celular e vê a ficha de emergência abrir na hora, sem instalar nada. Este documento reúne o que precisa estar certo para isso funcionar no dia.

## A decisão

O BioShield vai rodar num computador com Linux Mint, ligado pelo professor a um roteador. Para o QR abrir, o celular do visitante precisa estar no wifi desse roteador. Pelo 4G não abre.

Escolhemos esse caminho por ser o mais simples: não tem custo, não depende de hospedagem e fica tudo num lugar só. O preço é um passo a mais para o visitante, que precisa entrar no wifi antes de escanear. A montagem do servidor está em [`SERVIDOR_LINUX.md`](SERVIDOR_LINUX.md).

## Como funciona

O backend e o banco ficam no servidor, e o backend entrega também as telas, tudo na porta 3000. Cada QR Code guarda um endereço completo, que aponta para a página da ficha de emergência nesse servidor, com o código do paciente no final. O visitante conecta no wifi, aponta a câmera, o navegador abre a página e a ficha aparece.

Tudo depende de uma condição: **um celular no wifi do roteador precisa conseguir abrir o servidor.** Para tirar a dúvida, basta conectar um celular no wifi e abrir no navegador o endereço que o terminal do servidor mostra ao ligar, por exemplo `http://192.168.0.10:3000`. Se abrir, o plano funciona. Se não abrir, nenhum QR vai abrir, e a lista "Se o celular não abrir" do `SERVIDOR_LINUX.md` ajuda a achar o motivo.

## Perguntas para o professor

1. O roteador vai ser o mesmo no dia do evento? Trocar de roteador troca o endereço, e os QR Codes impressos param de abrir.
2. Dá para fixar o IP do servidor no roteador, para ele não mudar de um dia para o outro?
3. Qual é o nome e a senha do wifi? O visitante vai precisar dos dois.
4. Quantos aparelhos o roteador aguenta ao mesmo tempo?
5. O roteador isola os aparelhos do wifi uns dos outros? Se isolar, essa opção precisa estar desligada.
6. O servidor fica ligado durante todo o evento?

As duas primeiras são as mais importantes, porque o QR Code guarda o endereço do servidor e só pode ser impresso depois que esse endereço estiver decidido.

## O que vai na mesa

- **Uma placa bem visível, na frente dos QR Codes**, com o passo a passo: conecte no wifi (nome da rede), digite a senha e aponte a câmera para o QR Code. Se o wifi usar só senha, dá para imprimir também um QR Code de wifi, que conecta o celular ao ser escaneado; aí o visitante escaneia dois códigos e não digita nada.
- **Um celular da equipe já conectado**, para emprestar a quem não quiser ou não conseguir entrar no wifi.
- **Os QR Codes dos pacientes**, com o do paciente cancelado marcado.
- **O app instalado num celular**, com uma dose cadastrada para poucos minutos à frente, para mostrar o alarme tocando. O botão "Testar o alarme", na tela de Doses, faz o celular tocar em 5 segundos.

## O que pode dar errado

**QR Code impresso antes da hora.** O QR não guarda só o código do paciente: guarda o endereço inteiro do servidor. O BioShield já se protege de sair com `localhost` (o servidor informa o endereço de rede dele e a tela usa esse endereço), e se mesmo assim o endereço for local, a tela da ficha mostra um aviso em vermelho. Antes de imprimir, confira o endereço que aparece embaixo do QR na tela da ficha: ele tem que começar com o IP do servidor, o mesmo que o terminal mostra.

**Endereço que muda depois de impresso.** Se o IP, a porta ou o caminho da página mudarem depois da impressão, todos os papéis da mesa param de funcionar de uma vez. Em rede interna isso acontece quando o servidor reinicia e recebe outro IP. Por isso o IP precisa estar fixado no roteador antes de imprimir; mudou o endereço, imprime tudo de novo.

**Código que muda depois de impresso.** Trocar, cancelar ou reativar o QR de um paciente invalida o código antigo, e o papel impresso fica com ele. Depois de imprimir, ninguém mexe no QR dos pacientes da mesa; para mostrar o cancelamento, use o Roberto, que já vem cancelado nos dados fictícios. Os quatro pacientes do `dados_ficticios.sql` (Maria, Joana, Lucas e Roberto) têm código fixo no script, então rodar o script de novo mantém os mesmos QR Codes. Já apagar um paciente e criar de novo pelo app gera um código novo.

**Visitante no 4G.** Ele escaneia sem entrar no wifi, a página não abre e ele acha que o projeto não funciona. É por isso que a placa do wifi fica na frente dos QR Codes, e quem estiver na mesa avisa antes de a pessoa apontar a câmera.

**Wifi que não aceita visitante.** Se a rede pedir login de aluno ou cair com muita gente, o visitante não entra. Vale confirmar com o professor e deixar o celular de empréstimo pronto.

**Modo demonstração enganando.** Com o servidor fora do ar, a tela de entrada cai na demonstração e parece que está tudo funcionando. O risco é pequeno, porque quem escaneia um QR nunca vê dado fictício e quem está numa conta de verdade também não. Mesmo assim, olhe a tela de entrada antes de abrir a mesa: se aparecer o quadro "Modo demonstração", o servidor não está respondendo.

**Rede lenta.** O `TEMPO_LIMITE_MS` do `frontEnd/js/config.js` diz quanto as telas esperam o servidor antes de mostrar "Não consegui falar com o servidor". Ele está em 8 segundos. Se no teste com o wifi cheio esse aviso aparecer, aumente o valor.

**Página em HTTPS e servidor em HTTP.** O navegador bloqueia a mistura e a ficha não carrega, com o erro escondido no console. No servidor interno os dois ficam em HTTP. Funciona, mas o navegador do visitante pode mostrar o aviso de site não seguro.

**Porta bloqueada.** Algumas redes bloqueiam portas fora das comuns. Pode funcionar no computador por cabo e falhar no wifi; por isso o teste é sempre pelo celular, no wifi do roteador.

**Servidor sem o `.env` certo.** O `.env` do servidor é outro. Sem o `JWT_SECRET` o login quebra, e com os dados do banco errados nada carrega. Ele nunca vai para o Git.

**Dado real na mesa.** A ficha fica aberta para qualquer pessoa que escanear, e o papel pode ser fotografado e levado embora. Só pacientes fictícios: nenhum nome, telefone ou dado de saúde de pessoa real, nem o da equipe.

**QR que a câmera não lê.** QR pequeno demais, impressão clara, plástico com reflexo ou papel dobrado em cima do código. Imprima grande, em papel fosco, e teste cada papel com dois celulares diferentes.

## O que preparar no servidor

O `frontEnd/js/config.js` não precisa de nenhuma mudança: as telas acham o servidor sozinhas e montam o endereço do QR a partir dele. No servidor, seguindo o `SERVIDOR_LINUX.md`:

1. Banco criado com o `bioshield.sql` e preenchido com o `dados_ficticios.sql`.
2. `.env` do backend preenchido.
3. IP do servidor fixado no roteador.
4. Backend rodando com `npm start`. Ele entrega as telas junto; não existe pasta para publicar à parte.

## Linha do tempo

**Antes de tudo.** Fazer as perguntas ao professor e testar um celular no wifi do roteador abrindo o servidor.

**Uma semana antes.** Montar o servidor com o banco e os dados fictícios. Com o celular no wifi do roteador, abrir a ficha de um paciente. Decidir quantos pacientes vão para a mesa; se precisar de mais que os quatro do script, criar agora.

**Dois dias antes.** Gerar os QR Codes pela folha de impressão do site, aberto num computador pelo endereço de rede do servidor (no app, a impressão não existe). Imprimir os QR Codes e a placa do wifi. Testar cada papel com dois celulares no wifi do roteador. A partir daqui, ninguém troca, cancela ou recria paciente da mesa.

**Na véspera.** Escanear todos os papéis de novo, conferir que cada leitura aparece no histórico de acessos da ficha e deixar o plano B pronto. Rodar o `dados_ficticios.sql` de novo, para o histórico de doses ficar com cara de hoje (os QR Codes continuam os mesmos).

**No dia, antes de abrir a mesa.** Servidor ligado e respondendo, celular de empréstimo carregado e no wifi, um papel escaneado abrindo a ficha, o papel do Roberto mostrando o aviso de cancelado e o notebook com o plano B aberto.

## Plano B

Se o servidor ou o wifi caírem no meio do evento:

1. O vídeo gravado do fluxo completo.
2. O modo demonstração no notebook: com o `MODO` em `"demo"` no `config.js`, as telas mostram os dados fictícios sem servidor e sem internet, inclusive o alarme.
3. Prints da ficha de emergência impressos, para mostrar o que o visitante veria.

## Para abrir pelo 4G um dia

O caminho é hospedar o BioShield na internet: o backend e o banco num serviço que rode Node.js e MySQL, com um endereço com HTTPS. Os QR Codes teriam que ser gerados de novo, com o endereço novo. Hospedar só as telas não resolve, porque a ficha vem da API.

## Um ponto forte para mostrar

Cada leitura do QR fica registrada, com data, hora e o tipo de aparelho. Dá para mostrar ao visitante, na aba Privacidade da ficha do paciente, que a leitura dele acabou de aparecer. É a parte da LGPD funcionando ao vivo. Como o servidor é interno, o endereço gravado é o do celular dentro da rede do roteador.

## Quem confere o quê

Sugestão, para ajustar como preferirem:

- **Erik:** servidor, geração e impressão dos QR Codes e o celular do alarme.
- **Daiane:** banco no servidor com os dados fictícios, placa do wifi, teste de cada papel com dois celulares e plano B.
- **Os dois:** a conferência da véspera e a do dia.
