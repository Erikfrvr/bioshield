# Dia do evento: a mesa de QR Codes

A ideia é deixar na mesa os QR Codes de alguns pacientes fictícios. Quem passa escaneia com o próprio celular e vê a ficha de emergência abrir na hora, sem instalar nada. Este documento reúne o que precisa estar certo para isso funcionar no dia.

## A decisão

O BioShield vai rodar no notebook do Erik, levado no dia da apresentação, com o Tailscale Funnel ligado. O Funnel dá ao notebook um endereço público com HTTPS, e é esse endereço que vai dentro dos QR Codes:

```
https://bioshield.bonito-tench.ts.net
```

Com isso, o visitante escaneia pelo 4G ou por qualquer wifi, sem precisar entrar numa rede antes. O notebook só precisa de internet, e pode ser qualquer uma: wifi do Senac, cabo ou o 4G de um celular roteando. O endereço não muda quando a rede muda, então dá para imprimir os QR Codes em casa.

Escolhemos esse caminho por ser o mais simples para o visitante e por não ter custo. O preço é depender da internet do notebook e de um serviço de fora (o Tailscale). A montagem foi feita em 05/10 e 06/10, e está completa em [`SERVIDOR_ONLINE.md`](SERVIDOR_ONLINE.md).

## Como funciona

O backend e o banco ficam no notebook, e o backend entrega também as telas, tudo na porta 3000. O Funnel recebe os acessos da internet e repassa para essa porta. Cada QR Code guarda o endereço completo da página da ficha de emergência, com o código do paciente no final. O visitante aponta a câmera, o navegador abre a página e a ficha aparece.

Tudo depende de uma condição: **um celular no 4G precisa conseguir abrir o endereço `.ts.net`.** Para conferir, basta desligar o wifi de um celular e abrir no navegador `https://bioshield.bonito-tench.ts.net/api/status`. Se aparecer `"status":"ok"` e `"banco":"ok"`, o plano funciona. Em 06/10, o app no celular do Erik conectou por esse endereço com o wifi desligado.

## Perguntas para o professor ou para a organização

1. Tem tomada perto da mesa? O notebook fica ligado o evento inteiro.
2. O notebook pode usar o wifi do Senac? Algumas redes de escola bloqueiam programas como o Tailscale. Se bloquear, a internet vem do 4G de um celular da equipe roteando.
3. O sinal de 4G no local é bom? O visitante usa o próprio 4G para escanear, e o notebook pode precisar dele também.

## O que vai na mesa

- **Uma placa simples, na frente dos QR Codes**: "Aponte a câmera do celular para o QR Code". Não precisa de nome nem senha de wifi.
- **Um celular da equipe**, para emprestar a quem não quiser ou não conseguir escanear.
- **Os QR Codes dos pacientes**, com o do paciente cancelado marcado.
- **O notebook**, que é o servidor. Ele pode ficar na mesa mostrando a aba Privacidade, onde cada leitura aparece na hora.
- **O app instalado num celular**, com uma dose cadastrada para poucos minutos à frente, para mostrar o alarme tocando. O botão "Testar o alarme", na tela de Doses, faz o celular tocar em 5 segundos.
- **O app no celular de um cuidador**, na conta da Patrícia, para mostrar o aviso de dose perdida. Ele só chega 1 hora depois do horário da dose: uma hora antes do momento em que quiserem mostrar, cadastrem na conta do Lucas um remédio para dali a poucos minutos e não confirmem. O passo a passo está em "Testar os avisos no celular", no [`GUIA_APK.md`](GUIA_APK.md).

## O que pode dar errado

**QR Code impresso antes da hora.** O QR não guarda só o código do paciente: guarda o endereço inteiro do servidor. Antes de imprimir, confira o endereço que aparece embaixo do QR na tela da ficha: ele tem que começar com `https://` e terminar com `.ts.net`. Se o endereço só abrir no wifi ou no próprio notebook, a tela da ficha e a tela de etiquetas mostram um aviso.

**Endereço que muda depois de impresso.** Trocar o nome da máquina ou o nome da rede no painel do Tailscale, desinstalar o Tailscale ou trocar de conta muda o endereço, e todos os papéis da mesa param de funcionar de uma vez. Mudou o endereço, imprime tudo de novo.

**Código que muda depois de impresso.** Trocar, cancelar ou reativar o QR de um paciente invalida o código antigo, e o papel impresso fica com ele. Depois de imprimir, ninguém mexe no QR dos pacientes da mesa; para mostrar o cancelamento, use o Roberto, que já vem cancelado nos dados fictícios. Os quatro pacientes do `dados_ficticios.sql` (Maria, Joana, Lucas e Roberto) têm código fixo no script, então rodar o script de novo mantém os mesmos QR Codes. Já apagar um paciente e criar de novo pelo app gera um código novo.

**Um estranho cancelando o QR da mesa.** O endereço é público e as contas fictícias vêm com a senha `123456`. Quem entrasse como a Maria poderia cancelar o QR dela. Por isso a senha das contas fictícias é trocada antes de imprimir (passo 8 do `SERVIDOR_ONLINE.md`), e trocada de novo sempre que o script de dados rodar.

**Internet do notebook caindo.** Sem internet no notebook, nenhum QR abre. Tenham um celular da equipe pronto para rotear o 4G. Trocar de rede não muda o endereço: em alguns segundos tudo volta.

**Notebook dormindo ou reiniciando.** Suspensão, tampa fechada ou atualização do Windows derrubam o servidor. A lista "Preparar o notebook para o dia" do `SERVIDOR_ONLINE.md` resolve as três.

**MySQL desligado.** O servidor sobe mesmo com o banco desligado, mas nada carrega. O `/api/status` mostra `"banco":"fora do ar"` nesse caso, e o terminal do backend diz o que conferir.

**Modo demonstração enganando.** Com o servidor fora do ar, a tela de entrada cai na demonstração e parece que está tudo funcionando. O risco é pequeno, porque quem escaneia um QR nunca vê dado fictício e quem está numa conta de verdade também não. Mesmo assim, olhe a tela de entrada antes de abrir a mesa: se aparecer o quadro "Modo demonstração", o servidor não está respondendo.

**Rede lenta.** O `TEMPO_LIMITE_MS` do `frontEnd/js/config.js` diz quanto as telas esperam o servidor antes de mostrar "Não consegui falar com o servidor". Ele está em 8 segundos. Se no teste com o 4G esse aviso aparecer, aumente o valor.

**Limite do plano grátis.** O Funnel tem um limite de banda que o Tailscale não informa. A ficha de emergência é leve, então para uma mesa de evento não deve atrapalhar, mas ninguém testou com muita gente ao mesmo tempo.

**Servidor sem o `.env` certo.** Sem o `URL_PUBLICA`, o QR sai com o IP do wifi. Sem o `JWT_SECRET`, o login quebra. Com os dados do banco errados, nada carrega. O terminal do backend avisa dos três na subida. O `.env` nunca vai para o Git.

**Dado real na mesa.** A ficha fica aberta para qualquer pessoa que escanear, e o papel pode ser fotografado e levado embora. Só pacientes fictícios: nenhum nome, telefone ou dado de saúde de pessoa real, nem o da equipe.

**QR que a câmera não lê.** QR pequeno demais, impressão clara, plástico com reflexo ou papel dobrado em cima do código. Imprima grande, em papel fosco, e teste cada papel com dois celulares diferentes.

## O que preparar no notebook

Seguindo o `SERVIDOR_ONLINE.md`:

| O quê | Situação |
|---|---|
| Banco criado com o `bioshield.sql` e preenchido com o `dados_ficticios.sql` | Feito |
| `.env` do backend com `URL_PUBLICA` no endereço do Funnel e um `JWT_SECRET` forte | Feito em 06/10 |
| Tailscale instalado, com o nome da máquina e da rede definidos e o Funnel ligado | Feito em 06/10 |
| Senha das contas fictícias trocada | Falta |
| Energia e atualizações configuradas para o notebook não dormir nem reiniciar | Em parte: a suspensão já está em "Nunca"; faltam a tampa e as atualizações |
| MySQL ligando sozinho ao abrir o XAMPP | Falta |

O `frontEnd/js/config.js` não precisa de nenhuma mudança: as telas acham o servidor sozinhas e montam o endereço do QR a partir do que o backend informa. No app, o endereço do evento já vem escrito na tela de entrada.

## Linha do tempo

**Antes de tudo.** Instalar o Tailscale no notebook, escolher o nome da máquina, ligar o Funnel e abrir o BioShield pelo 4G. Feito em 06/10.

**Uma semana antes.** Banco com os dados fictícios, `.env` completo e o teste completo do passo 6 do `SERVIDOR_ONLINE.md`: dois celulares no 4G, um mostrando o QR e o outro escaneando. Decidir quantos pacientes vão para a mesa; se precisar de mais que os quatro do script, criar agora.

**Dois dias antes.** Trocar a senha das contas fictícias. Gerar os QR Codes pela tela de etiquetas, no navegador do notebook ou no app (os dois dão o mesmo resultado), conferindo que não aparece aviso vermelho. O PDF da folha, no tamanho real, também serve para imprimir numa gráfica. Imprimir os QR Codes e a placa. Testar cada papel com dois celulares no 4G. A partir daqui, ninguém troca, cancela ou recria paciente da mesa, e ninguém mexe no nome da máquina no Tailscale.

**Na véspera.** Rodar o `dados_ficticios.sql` de novo, para o histórico de doses ficar com cara de hoje (os QR Codes continuam os mesmos), e trocar de novo a senha das contas fictícias. Escanear todos os papéis, conferir que cada leitura aparece no histórico de acessos da ficha e deixar o plano B pronto. Carregar o notebook e o celular que vai rotear.

**No dia, antes de abrir a mesa.** Seguir a lista "No dia do evento" do `SERVIDOR_ONLINE.md`: notebook na tomada e com internet, MySQL, backend, Funnel, `/api/status` pelo 4G e um papel escaneado abrindo a ficha. Conferir também o papel do Roberto mostrando o aviso de cancelado e o plano B aberto.

## Plano B

Se a internet ou o notebook caírem no meio do evento:

1. Rotear o 4G de um celular da equipe para o notebook. O endereço não muda.
2. O vídeo gravado do fluxo completo.
3. O modo demonstração: com o `MODO` em `"demo"` no `config.js`, as telas mostram os dados fictícios sem servidor e sem internet, inclusive o alarme.
4. Prints da ficha de emergência impressos, para mostrar o que o visitante veria.

## Um ponto forte para mostrar

Cada leitura do QR fica registrada, com data, hora, o tipo de aparelho e o IP de quem escaneou. Dá para mostrar ao visitante, na aba Privacidade da ficha do paciente, que a leitura dele acabou de aparecer. É a parte da LGPD funcionando ao vivo.

## Quem confere o quê

Sugestão, para ajustar como preferirem:

- **Erik:** notebook servidor, Tailscale, geração e impressão dos QR Codes e o celular do alarme.
- **Daiane:** banco no notebook com os dados fictícios, troca da senha das contas, placa da mesa, teste de cada papel com dois celulares e plano B.
- **Os dois:** a conferência da véspera e a do dia.
