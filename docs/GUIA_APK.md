# App Android do BioShield

O app Android é o mesmo conjunto de telas do site, empacotado com o Capacitor. Nada foi reescrito: as telas da pasta `frontEnd/` vão para dentro do app, e o servidor continua sendo o mesmo backend que entrega o site.

Este guia explica como gerar o APK, como o app encontra o servidor e como funciona o alarme dos remédios, que é a parte que só existe no app.

## Como o app conversa com o servidor

O app leva só as telas. A API e o banco ficam no computador que roda o backend. No evento, é o notebook do Erik com o Tailscale Funnel, descrito em [`SERVIDOR_ONLINE.md`](SERVIDOR_ONLINE.md), e aí o celular funciona em qualquer internet. Sem o Funnel, usando o IP da rede local, o celular precisa estar no mesmo wifi do computador.

Na primeira vez que o app abre, a tela de entrada mostra o quadro **Servidor**. A pessoa toca em "Informar o endereço do servidor", escreve o endereço e toca em "Testar e salvar". Com o Funnel, é o endereço `.ts.net` (por exemplo `bioshield.tail1234ab.ts.net`), com ou sem o `https://`. Na rede local, é o número que o terminal do servidor mostrou (por exemplo `192.168.0.10`), e a porta 3000 entra sozinha. Quando aparece "Conectado ao servidor", é só entrar com a conta. O app guarda o endereço; se o servidor mudar de IP, o mesmo quadro tem o botão "Trocar de servidor". Trocar de servidor não exige gerar o APK de novo.

Por trás disso, o `frontEnd/js/api.js` testa os endereços nesta ordem e fica com o primeiro que responder em `/api/status`:

1. o endereço salvo no quadro Servidor
2. o campo `SERVIDOR` do `frontEnd/js/config.js`, se alguém preencher
3. fora do app, o endereço da própria página (é o caso do site entregue pelo backend)
4. `http://localhost:3000`

Se nenhum responder, o app entra no modo demonstração, com dados fictícios e um aviso na tela. Quem já está logado numa conta de verdade não cai na demonstração: vê o aviso de que não conseguiu falar com o servidor.

O QR Code gerado no app guarda o endereço de rede do servidor, por exemplo `http://192.168.0.10:3000/pages/emergencia.html?token=...`, nunca `localhost` nem o endereço interno do celular. Por isso ele só abre para quem está no mesmo wifi do servidor. Para abrir pelo 4G, o BioShield precisaria estar hospedado na internet.

## O que instalar no computador

- **Node.js 22 ou mais novo.** O Capacitor não roda em versão mais antiga. Confira com `node -v`.
- **Android Studio** recente. Ele traz o Android SDK e o Java. O projeto usa o plugin do Android 8.13 e o Gradle 8.14.3, que rodam com Java 21.
- **Um celular Android 7 ou mais novo**, ou um celular virtual (emulador) criado no próprio Android Studio.

## Gerar o APK

Na pasta raiz do projeto, uma vez depois de clonar e de novo sempre que algo mudar em `frontEnd/`:

```bash
npm install
npm run app:sync
```

O `npm install` baixa o Capacitor e os plugins (sem ele o Android Studio reclama que não acha o `capacitor-android`). O `npm run app:sync` copia as telas para dentro do projeto Android e registra os plugins. Se o APK for gerado sem o `app:sync`, ele sai com as telas antigas.

Depois, no Android Studio:

1. Na tela inicial do Android Studio, toque em **Open** e escolha a pasta **`android`** de dentro do projeto. Tem que ser a pasta `android`, não a `bioshield` inteira: aberta pela raiz, o Android Studio não carrega o projeto e o menu de gerar APK não aparece. O comando `npm run app:abrir` já abre na pasta certa.
2. Se ele perguntar se confia no projeto, toque em **Trust Project**.
3. Se aparecer o aviso "Please Select Gradle JVM", toque em **Use JVM 21**. O Gradle do projeto não roda com o Java 25 que vem nas versões novas do Android Studio.
4. Espere a sincronização do Gradle terminar, acompanhando a barra no rodapé. Na primeira vez demora alguns minutos e precisa de internet. Quando terminar, a lista da esquerda mostra os módulos `app`, `capacitor-android`, `capacitor-app` e `capacitor-local-notifications`.
5. Se aparecer a sugestão de atualizar o plugin do Android ("Start AGP Upgrade Assistant"), não aceite. O mesmo vale para "Migrate to Gradle Daemon toolchain": toque em **Ignore**. Os dois mudam arquivos do projeto sem necessidade.
6. Nas versões novas do Android Studio o menu fica escondido no ícone de três tracinhos (☰), no canto superior esquerdo. Vá em **Build**, depois **Generate App Bundles or APKs**, depois **Generate APKs**.
7. Quando terminar, o aviso no canto de baixo tem o link **locate**, que abre a pasta do arquivo.

O APK sai em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

É um APK de depuração, assinado com a chave padrão do Android. Serve para instalar direto no celular e apresentar.

## Instalar e testar

**Pelo arquivo:** mande o `app-debug.apk` para o celular (cabo, Drive ou mensagem), toque nele e permita instalar de fonte desconhecida quando o Android perguntar.

**Pelo cabo:** ligue a depuração USB no celular, conecte, escolha o aparelho na lista do topo do Android Studio e toque no triângulo verde. Ele instala e já abre o app.

**No celular virtual:** o mesmo triângulo verde, com o emulador escolhido na lista. Dentro do emulador, o computador aparece no endereço `10.0.2.2`, então no quadro Servidor escreva `10.0.2.2:3000`. O emulador precisa de bastante espaço livre no disco onde ficam os dados do Android Studio (o celular virtual padrão reserva 10 GB). Se ele não abrir por falta de espaço, diminua o armazenamento interno nas configurações do celular virtual (**Device Manager**, depois **Edit**, depois **Advanced Settings**).

**Testar sem wifi, pelo cabo:** com a depuração ligada e o backend rodando no próprio computador, o comando abaixo faz o celular enxergar a porta 3000 do computador como se fosse dele. O app acha o servidor sozinho, pelo `localhost:3000`. O comando precisa ser repetido toda vez que o cabo sai.

```bash
adb reverse tcp:3000 tcp:3000
```

## Botão Voltar

Sem plugin, o Capacitor fecha o app no primeiro toque em Voltar, em qualquer tela. Por isso o projeto usa o plugin oficial `@capacitor/app`, e o `frontEnd/js/ui.js` decide o que o Voltar faz:

1. se tem uma janela aberta (novo remédio, cancelar QR Code, alarme de remédio), ela fecha
2. se dá para voltar, volta para a tela anterior
3. na primeira tela, fecha o app

Fechar a janela de alarme com o Voltar não desliga o alarme: o próximo lembrete toca do mesmo jeito.

## Alarme dos remédios

Na hora de cada dose o celular toca um alarme, com som próprio e vibração, e repete a cada 5 minutos até a pessoa confirmar. Toca com a tela bloqueada e com o app fechado, porque quem dispara é o Android, e não a página. Funciona igual com o servidor e no modo demonstração.

### Como funciona

O `frontEnd/js/lembretes.js` busca as doses previstas dos próximos 2 dias em `GET /api/doses/proximas` (na demonstração, nos dados fictícios) e agenda os avisos no próprio celular com o plugin oficial `@capacitor/local-notifications`.

Cada dose ganha 13 avisos: um no horário e um a cada 5 minutos, até 60 minutos depois. Aos 60 minutos a dose passa a contar como perdida (é a tolerância do backend), e o último aviso diz isso. A agenda tem no máximo 300 avisos, os mais próximos primeiro, porque o Android aceita até 500 alarmes por app.

Na barra de notificações fica **um aviso por dose**. Com o app aberto ou em segundo plano, o lembrete novo tira o anterior da mesma dose na hora. Com o app fechado, os lembretes se acumulam até a próxima vez que o app abrir, e aí fica só o mais recente. Cada aviso tem dois botões:

- **Tomei** confirma a dose no servidor. Funciona até com o app fechado: o app abre, vai para a tela de Doses e confirma.
- **Lembrar em 5 min** troca os lembretes dos próximos 5 minutos por um aviso só, daqui a 5 minutos.

Tocar no texto do aviso abre o app direto na janela de alarme daquela dose. Quando várias notificações do BioShield se acumulam, o Android junta todas num grupo e esconde os botões; um toque no grupo mostra cada aviso com os seus botões.

Com o app aberto, aparece também a **janela de alarme** por cima da tela, com o sino balançando, som, vibração e os mesmos dois botões. Se duas doses chegam juntas, a segunda espera na fila da janela.

A agenda do alarme é refeita quando qualquer tela abre (no máximo a cada 5 minutos), quando o app volta do fundo, ao confirmar uma dose, ao cadastrar, suspender, reativar ou remover remédio, ao criar a ficha e ao entrar na conta. Remédio suspenso para de tocar na hora. Sair da conta cancela todos os avisos e limpa a barra. Conta de cuidador, sem ficha própria, não recebe alarme. Sem internet, os avisos que já estão no celular continuam tocando; só a confirmação precisa do servidor.

No navegador (o site), o alarme toca enquanto o BioShield estiver aberto: a janela de alarme abre na hora certa, com som. Só o app toca com o celular bloqueado.

### Permissões

| Permissão | Como funciona |
|---|---|
| Notificações (Android 13 em diante) | O app pede sozinho na primeira visita à tela de Doses, ou ao cadastrar o primeiro remédio. O Android mostra a pergunta "Permitir que o BioShield envie notificações?" |
| Alarme no horário exato | Liberada na instalação pela permissão `USE_EXACT_ALARM` (Android 13 em diante). No Android 12 já vem liberada. Se o celular bloquear, o cartão da tela de Doses mostra o botão "Liberar horário exato" |
| Acordar o celular, religar os alarmes depois de reiniciar e vibrar | Vêm declaradas no manifesto e não pedem nada à pessoa |

Na tela de Doses fica o **cartão do alarme**: ele mostra se está tudo certo, qual é o próximo alarme e tem o botão **Testar o alarme**, que toca um aviso de teste em 5 segundos.

Três coisas dependem do celular, e não do app:

- O som segue o **volume de notificação**. No modo "Não perturbe", o Android pode silenciar.
- Algumas marcas seguram alarmes para economizar bateria. Se o alarme atrasar, deixe o BioShield sem restrição de bateria nas configurações; o caminho muda de marca para marca.
- Com a tela bloqueada, o Android pode esconder o texto do aviso, conforme a privacidade escolhida no celular. O som e a vibração tocam do mesmo jeito.

### Testar o alarme no celular

1. Gere e instale o APK (sempre depois do `npm run app:sync`).
2. Entre na conta, abra a tela de **Doses** e permita as notificações.
3. No cartão do alarme, toque em **Testar o alarme** e bloqueie a tela. Em 5 segundos o celular toca.
4. Para ver uma dose de verdade, cadastre um remédio com a primeira dose 2 ou 3 minutos à frente, feche o app e espere. Ele toca no horário e de novo a cada 5 minutos, até alguém tocar em **Tomei**.
5. Sem servidor, entre na demonstração com a Maria: os remédios dela já estão no alarme.

### Onde cada parte mora

| Arquivo | O que tem |
|---|---|
| `frontEnd/js/lembretes.js` | Agenda, textos, janela de alarme, som da janela, botões e cartão |
| `backend/services/DoseService.ts` | A rota de próximas doses (`listarProximas`) e o tamanho da janela (`DIAS_DE_LEMBRETE`) |
| `android/app/src/main/res/raw/bioshield_alarme.wav` | O som: três bipes curtos e um longo, repetidos três vezes, em 4 segundos |
| `android/app/src/main/res/drawable/ic_stat_bioshield.xml` | O escudo branco da barra de status |
| `android/app/src/main/AndroidManifest.xml` | As permissões `USE_EXACT_ALARM` e `VIBRATE` |
| `capacitor.config.json` | Ícone, cor e som padrão do plugin |

O Android guarda o som e a importância no **canal** de notificação (`bioshield_alarme`) e não deixa mudar depois de criado. Para trocar o som, troque o `.wav` e também o nome do canal no `lembretes.js` (por exemplo `bioshield_alarme_2`). Sem isso, quem já tem o app instalado continua ouvindo o som antigo.

### Textos do alarme

Na notificação, `{remédio}`, `{dose}` e `{hora}` são trocados pelo nome do remédio, pela quantidade (por exemplo "50 mg") e pelo horário da dose.

| Quando | Título | Texto |
|---|---|---|
| No horário | Hora do remédio: {remédio} | Tome {dose} agora. Depois toque em Tomei. |
| De 5 em 5 minutos, até 55 minutos depois | Lembrete: {remédio} | A dose das {hora} ainda não foi confirmada. Tome {dose} e toque em Tomei. |
| 60 minutos depois | Último aviso: {remédio} | A dose das {hora} passou 1 hora sem confirmação. Se já tomou, toque em Tomei. |
| Depois de "Lembrar em 5 min" | Lembrete: {remédio} | Você pediu para lembrar de novo. Tome {dose} e toque em Tomei. |
| Teste | Teste do alarme do BioShield | Se você ouviu o som e viu este aviso, o alarme dos remédios está funcionando. |

Os botões são **Tomei** e **Lembrar em 5 min**. Nas configurações do Android, o canal aparece como **Alarme dos remédios**, com a descrição "Toca na hora de cada dose e repete a cada 5 minutos até você confirmar."

Na janela de alarme (com o app aberto):

| Parte | Texto |
|---|---|
| Rótulo | "Hora do remédio", ou "Lembrete do remédio" quando a dose já está atrasada, ou "Teste do alarme" |
| Nome | {remédio} |
| Detalhe | Tome {dose}. Dose das {hora}. |
| Detalhe no teste | Se você ouviu o som, o alarme dos remédios está funcionando. |
| Fila | "Depois deste, tem mais 1 remédio esperando." ou "Depois deste, tem mais {n} remédios esperando." |
| Botões | Tomei e Lembrar em 5 min |

No cartão do alarme, na tela de Doses:

| Situação | Título | Texto | Botões |
|---|---|---|---|
| Tudo certo | Alarme ligado | O celular toca na hora de cada dose e repete a cada 5 minutos até você confirmar. Funciona com a tela bloqueada e com o app fechado. | Testar o alarme |
| Ainda sem permissão | Alarme desligado | Para o celular avisar na hora do remédio, permita as notificações do BioShield. | Ligar o alarme |
| Permissão negada | Notificações bloqueadas | O celular está bloqueando os avisos do BioShield. Abra as Configurações do celular, toque em Apps, depois em BioShield, depois em Notificações, e permita. | Já permiti, conferir de novo |
| Sem horário exato | Alarme ligado, mas pode atrasar | O Android está segurando o horário exato dos alarmes. Toque em Liberar horário exato e ative a opção do BioShield. | Liberar horário exato e Testar o alarme |
| No navegador | Alarme com a tela aberta | No navegador, o alarme toca enquanto o BioShield estiver aberto. No app Android ele toca mesmo com o celular bloqueado. | Testar o alarme |

Embaixo do texto, quando está tudo certo, aparece "Próximo alarme: {remédio}, {quando}." ou "Nenhuma dose nos próximos 2 dias."

Recados (a faixa que aparece no rodapé da tela por alguns segundos):

| Quando | Recado |
|---|---|
| Dose confirmada pelo alarme | Dose de {remédio} confirmada. |
| A dose já tinha sido confirmada | Essa dose já estava confirmada. |
| O servidor recusou a confirmação | Não consegui confirmar. {motivo} |
| Lembrar em 5 min | Vou lembrar de novo em 5 minutos. |
| Teste no app | O alarme de teste toca em 5 segundos. Pode bloquear a tela para conferir. |
| Teste no navegador | O alarme de teste toca em 5 segundos. |
| Tomei ou Lembrar no teste | Teste concluído. O alarme está funcionando. |
| Permissão concedida pelo cartão | Alarme ligado. |
| Permissão negada pelo cartão | O celular não deixou ligar o alarme. Siga o passo a passo do cartão. |
| Teste sem permissão | O celular não deixou o BioShield mostrar avisos. Veja o cartão do alarme na tela de doses. |

## O que o app não faz

- **Baixar a imagem do QR Code e imprimir as etiquetas.** As duas coisas dependem do navegador. No app, os botões dão lugar a um recado com o endereço para abrir o BioShield no computador, onde a impressão funciona.
- **Ícone no Android 7.** O ícone do BioShield aparece do Android 8 em diante. No Android 7 fica o ícone padrão do Capacitor.

## Problemas comuns

| O que acontece | Causa provável |
|---|---|
| O Android Studio não acha o `capacitor-android` | Faltou o `npm install` na raiz |
| O menu Build não tem a opção de gerar APK | O projeto foi aberto pela pasta `bioshield`, e não pela `android` |
| "Please Select Gradle JVM" ao abrir | Escolha "Use JVM 21" |
| O app abre com as telas antigas | Faltou o `npm run app:sync` antes de gerar |
| "O BioShield não respondeu em..." ao salvar o servidor | Com o endereço `.ts.net`: celular sem internet, backend desligado ou Funnel desligado (`tailscale funnel status` no notebook). Com IP da rede local: celular fora do wifi do computador, IP errado ou firewall do Windows barrando a porta 3000 |
| O app abre no modo demonstração | Nenhum servidor respondeu. Informe o endereço no quadro Servidor |
| O emulador não abre: "Not enough space to create userdata partition" | Pouco espaço no disco. Diminua o armazenamento do celular virtual ou libere espaço |
| O `npm run app:sync` reclama da versão do Node | Node abaixo do 22 |
| O alarme não toca | Notificações bloqueadas (veja o cartão do alarme), ou o APK foi gerado sem o `npm run app:sync` e o plugin não entrou |
| O alarme toca atrasado | O celular está segurando alarmes para economizar bateria |
| O alarme toca sem som | Volume de notificação no zero ou modo "Não perturbe" ligado |
| Trocou o som e continua o antigo | O Android guarda o som no canal; troque também o nome do canal no `lembretes.js` |

## O que foi testado

O APK foi compilado pela linha de comando e pelo Android Studio, e conferido por dentro: pacote `br.com.bioshield.app`, Android 7 em diante, permissões, HTTP liberado para a rede local, telas iguais às da pasta `frontEnd/`, os dois plugins registrados e assinatura válida.

Ele também rodou num celular virtual do Android Studio, com a API 37 do Android, controlado de fora, contra um servidor de teste. Nesse teste:

- o app encontrou o servidor pelo quadro Servidor e entrou na conta
- o Android pediu a permissão de notificação na tela de Doses, e o cartão ficou em "Alarme ligado"
- o alarme tocou no horário, com o título, o texto, o canal e os dois botões certos, e a janela de alarme abriu dentro do app
- o botão **Tomei** da notificação confirmou a dose no servidor e tirou os avisos dela da barra
- com o app fechado, o alarme da dose seguinte tocou e o lembrete de 5 minutos tocou de novo
- o **Tomei** com o app fechado abriu o app na tela de Doses e confirmou a dose
- ao abrir o app depois de dois avisos acumulados, ficou só o lembrete mais recente na barra

O resto (o botão Voltar, o adiar, as permissões negadas, a demonstração, sair da conta) foi testado no navegador, simulando o Android.

Ainda não foi feito o teste num celular físico de marca, que é onde aparecem as diferenças de economia de bateria de cada fabricante.

## O que vai para o Git

A pasta `android/` vai para o Git. O próprio Capacitor já ignora a cópia das telas (`android/app/src/main/assets/public`) e as pastas de compilação. Por isso quem clona o repositório precisa rodar `npm install` e `npm run app:sync` antes de abrir o Android Studio.

O comando `npx cap add android` não deve ser rodado de novo: a pasta já existe, e gerar outra por cima dá conflito.

## Play Store

Publicar é outra etapa: conta paga de desenvolvedor, APK assinado com chave própria e a política do Google para apps de saúde. A permissão `USE_EXACT_ALARM` também precisaria ser revista, porque a loja só aceita essa permissão em apps de despertador e agenda. Para o Empreenda, o APK instalado direto no celular é suficiente.
