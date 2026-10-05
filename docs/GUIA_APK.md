# Guia: gerar o app Android do BioShield

Como o Erik e a Daiane geram o APK pelo Android Studio e como o app encontra o servidor.

## O que já está pronto no repositório

O app é o front que já existe, empacotado com o **Capacitor**. O front não foi reescrito e o backend não mudou de lugar.

- `capacitor.config.json`, na raiz, com o nome do app (`BioShield`), o identificador (`br.com.bioshield.app`) e a pasta das telas (`frontEnd`)
- a pasta `android/`, que é o projeto que o Android Studio abre
- ícone e tela de abertura com o escudo e o teal do BioShield
- na tela de entrada, o quadro **Servidor**, onde a pessoa escreve o endereço do computador que roda o backend

O app não leva o backend junto. Ele é só as telas. A API e o MySQL rodam no servidor (ver `docs/SERVIDOR_LINUX.md`), e o celular precisa estar no mesmo wifi.

## O que instalar no computador

1. **Node.js 22 ou mais novo.** O Capacitor não roda em versão mais antiga. Confira com `node -v`.
2. **Android Studio**, na versão mais recente do site. Ele já traz o Android SDK e o Java que o projeto usa. O projeto foi gerado com o plugin do Android na versão 8.13, que pede o Android Studio de 2025 em diante. Se ele reclamar da versão do plugin ao abrir, atualize o Android Studio.
3. Um **celular Android** (versão 7 ou mais nova) com a depuração USB ligada, ou um emulador criado no Android Studio.

## Gerar o APK

Na raiz do projeto:

```
npm install
npm run app:sync
npm run app:abrir
```

O que cada um faz:

- `npm install` baixa o Capacitor. Sem isso o Android Studio não acha uma parte do projeto e dá erro de `capacitor-android` não encontrado
- `npm run app:sync` copia a pasta `frontEnd/` para dentro do projeto Android
- `npm run app:abrir` abre o Android Studio na pasta `android/`. Também dá para abrir na mão, pelo menu de abrir projeto, escolhendo a pasta `android`

No Android Studio:

1. Espere a sincronização terminar. Na primeira vez ele baixa bastante coisa e precisa de internet. Só continue quando a barra de baixo parar.
2. Para rodar direto no celular: conecte pelo cabo, escolha o aparelho na lista de cima e aperte o botão de rodar.
3. Para gerar o arquivo: no menu **Build**, use a opção de gerar APK. O nome exato do item muda de uma versão para outra, algo como "Generate App Bundles or APKs" e depois "Generate APKs".

O arquivo sai em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

É um APK de depuração. Serve para instalar direto no celular e apresentar. Para instalar pelo arquivo, o celular precisa permitir apps de fonte desconhecida.

## Toda vez que o front mudar

O app carrega uma cópia das telas. Mudou qualquer coisa em `frontEnd/`:

```
npm run app:sync
```

e gere o APK de novo. Sem isso o app continua com as telas antigas.

## Usar o app

1. Ligue o servidor. O terminal dele mostra o endereço, por exemplo `http://192.168.0.10:3000`.
2. Coloque o celular no mesmo wifi.
3. Abra o app. Na tela de entrada, no quadro **Servidor**, toque em "Informar o endereço do servidor".
4. Escreva só o número, por exemplo `192.168.0.10`, e toque em "Testar e salvar". A porta 3000 é colocada sozinha.
5. Quando aparecer "Conectado ao servidor", é só entrar com a conta.

O app guarda o endereço. Se o servidor mudar de IP, toque em "Trocar de servidor" e escreva o novo. Não precisa gerar o APK de novo por causa disso.

## Como o app acha o servidor

A conta está no `frontEnd/js/api.js`. Ele tenta, nesta ordem:

1. o endereço salvo no quadro Servidor
2. o campo `SERVIDOR` do `frontEnd/js/config.js`, se alguém preencher
3. fora do app, o endereço da própria página, que é o caso do site entregue pelo backend
4. `http://localhost:3000`

Só vale o endereço que responder em `/api/status`. Se nenhum responder, o app entra no **modo demonstração**, com dados fictícios, e avisa isso na tela. Quem já está logado em uma conta de verdade não cai na demonstração: vê o aviso de que não conseguiu falar com o servidor.

## Botão de voltar do Android

Sem plugin, o Capacitor fecha o app no primeiro toque em Voltar, em qualquer tela. Por isso o projeto usa o plugin oficial `@capacitor/app` (já está no `package.json` da raiz), e o `frontEnd/js/ui.js` decide o que o Voltar faz:

1. se tem uma janela aberta (cancelar QR Code, novo remédio), ela fecha
2. se dá para voltar, volta para a tela anterior
3. na primeira tela, fecha o app

O `npm run app:sync` registra o plugin no projeto Android sozinho. O comportamento foi testado no navegador simulando o aviso que o Android manda, ainda não num celular.

A janela de alarme dos remédios também fecha com o Voltar. O alarme não para por isso: o próximo lembrete toca do mesmo jeito.

## Alarme dos remédios

Na hora de cada dose o celular toca um alarme, com som próprio e vibração, e repete **a cada 5 minutos até a pessoa confirmar**. Funciona com a tela bloqueada e com o app fechado, porque quem dispara é o Android, e não a página. Funciona igual no modo demonstração e com o servidor.

### Como funciona

- **De onde vem a agenda.** O `frontEnd/js/lembretes.js` busca as próximas doses em `GET /api/doses/proximas` (na demonstração, nos dados fictícios) e agenda os avisos no próprio celular com o plugin oficial `@capacitor/local-notifications`.
- **Quantos avisos.** Cada dose ganha 13 avisos: um no horário e um a cada 5 minutos até 60 minutos depois. Aos 60 minutos a dose passa a contar como perdida (é a tolerância do backend), e por isso o último aviso diz que passou 1 hora. A agenda cobre os próximos 2 dias, com no máximo 300 avisos, porque o Android aceita no máximo 500 alarmes por app.
- **Botões na notificação.** **Tomei** confirma a dose no servidor, mesmo com o app fechado: o app abre, vai para a tela de Doses e confirma. **Lembrar em 5 min** troca os lembretes dos próximos 5 minutos por um aviso só, daqui a 5 minutos.
- **Tocar no texto da notificação** abre o app direto na janela de alarme daquela dose.
- **Com o app aberto** aparece também a **janela de alarme** por cima da tela, com o sino balançando, som e vibração, e os mesmos dois botões. Se duas doses chegam juntas, a segunda espera na fila da janela.
- **Dose confirmada** em qualquer lugar (tela de Doses, janela de alarme ou botão da notificação): os lembretes que faltavam dela são cancelados e as notificações dela somem da barra.
- **A agenda é refeita** ao abrir qualquer tela (no máximo a cada 5 minutos), quando o app volta do fundo, ao confirmar dose, ao cadastrar, suspender, reativar ou remover remédio, ao criar a ficha e ao entrar na conta. Remédio suspenso para de tocar na hora.
- **Sair da conta** cancela todos os avisos. Conta de cuidador, sem ficha própria, não recebe alarme.
- **Sem internet**, os avisos que já estão no celular continuam tocando. Só a confirmação precisa do servidor.
- **No navegador** (site), o alarme toca enquanto o BioShield estiver aberto: a janela de alarme abre na hora certa, com som. Só o app toca com a tela bloqueada.

### Permissões

| O quê | Quando | O que a pessoa vê |
|---|---|---|
| Notificações (Android 13 em diante) | O app pede sozinho na primeira visita à tela de Doses, ou ao cadastrar o primeiro remédio | A janela do próprio Android, "Permitir que o BioShield envie notificações?" |
| Alarme no horário exato | Liberado sozinho pela permissão `USE_EXACT_ALARM` do `AndroidManifest.xml` (Android 13 em diante). No Android 12 já vem liberado | Nada. Se o celular bloquear, o cartão da tela de Doses mostra o botão "Liberar horário exato" |
| Acordar o celular, religar os alarmes depois de reiniciar, vibrar | Já vêm no manifesto, não pedem nada | Nada |

A tela de Doses tem o **cartão do alarme**, que mostra se está tudo certo, o próximo alarme e o botão **Testar o alarme**.

Avisos que valem para qualquer celular:

- O som segue o **volume de notificação** do celular. No modo "Não perturbe", o Android pode silenciar.
- Algumas marcas seguram alarmes para economizar bateria. Se o alarme atrasar, deixe o BioShield sem restrição de bateria nas configurações do celular. O caminho muda de marca para marca.
- Na tela bloqueada, o Android pode esconder o texto do aviso, conforme a configuração de privacidade do celular. O som e a vibração tocam do mesmo jeito.

### Como testar no celular

1. Gere e instale o APK de novo (o alarme precisa do `npm run app:sync`, que registra o plugin novo).
2. Entre na conta e abra a tela de **Doses**. Permita as notificações quando o Android perguntar.
3. No cartão do alarme, toque em **Testar o alarme** e bloqueie a tela. Em 5 segundos o celular toca.
4. Para ver o alarme de uma dose de verdade: cadastre um remédio com o horário da primeira dose 2 ou 3 minutos à frente, saia do app e espere. Ele toca no horário e repete a cada 5 minutos até você tocar em **Tomei**.
5. Na demonstração (sem servidor), entre com a Maria: os remédios dela já estão no alarme.

### Arquivos do alarme

| Arquivo | O que tem |
|---|---|
| `frontEnd/js/lembretes.js` | Toda a lógica: agenda, textos, janela de alarme, som, botões e cartão |
| `backend/services/DoseService.ts` | `listarProximas` e o `DIAS_DE_LEMBRETE` |
| `android/app/src/main/res/raw/bioshield_alarme.wav` | O som: três bipes curtos e um longo, repetidos três vezes (4 segundos) |
| `android/app/src/main/res/drawable/ic_stat_bioshield.xml` | O escudo branco que aparece na barra de status |
| `android/app/src/main/AndroidManifest.xml` | As permissões `USE_EXACT_ALARM` e `VIBRATE` |
| `capacitor.config.json` | Ícone, cor e som padrão do plugin |

O Android guarda o som e a importância no **canal** de notificação (`bioshield_alarme`), e não deixa mudar depois de criado. Para trocar o som, troque o arquivo `.wav` **e** o nome do canal no `lembretes.js` (por exemplo `bioshield_alarme_2`), senão o celular continua com o som antigo.

### Mensagens do alarme

Notificação no celular (`{remédio}`, `{dose}` e `{hora}` são trocados pelo remédio, pela dose, como "50 mg", e pelo horário da dose):

| Quando | Título | Texto |
|---|---|---|
| No horário | Hora do remédio: {remédio} | Tome {dose} agora. Depois toque em Tomei. |
| De 5 em 5 minutos, até 55 minutos depois | Lembrete: {remédio} | A dose das {hora} ainda não foi confirmada. Tome {dose} e toque em Tomei. |
| 60 minutos depois | Último aviso: {remédio} | A dose das {hora} passou 1 hora sem confirmação. Se já tomou, toque em Tomei. |
| Depois de "Lembrar em 5 min" | Lembrete: {remédio} | Você pediu para lembrar de novo. Tome {dose} e toque em Tomei. |
| Teste | Teste do alarme do BioShield | Se você ouviu o som e viu este aviso, o alarme dos remédios está funcionando. |

Botões da notificação: **Tomei** e **Lembrar em 5 min**. Nome do canal nas configurações do Android: **Alarme dos remédios**, com a descrição "Toca na hora de cada dose e repete a cada 5 minutos até você confirmar."

Janela de alarme (com o app aberto):

| Parte | Texto |
|---|---|
| Rótulo | Hora do remédio · Lembrete do remédio (dose atrasada) · Teste do alarme |
| Nome | {remédio} |
| Detalhe | Tome {dose}. Dose das {hora}. |
| Detalhe no teste | Se você ouviu o som, o alarme dos remédios está funcionando. |
| Fila | Depois deste, tem mais 1 remédio esperando. · Depois deste, tem mais {n} remédios esperando. |
| Botões | Tomei · Lembrar em 5 min |

Cartão do alarme, na tela de Doses:

| Situação | Título | Texto | Botões |
|---|---|---|---|
| Tudo certo | Alarme ligado | O celular toca na hora de cada dose e repete a cada 5 minutos até você confirmar. Funciona com a tela bloqueada e com o app fechado. | Testar o alarme |
| Ainda sem permissão | Alarme desligado | Para o celular avisar na hora do remédio, permita as notificações do BioShield. | Ligar o alarme |
| Permissão negada | Notificações bloqueadas | O celular está bloqueando os avisos do BioShield. Abra as Configurações do celular, toque em Apps, depois em BioShield, depois em Notificações, e permita. | Já permiti, conferir de novo |
| Sem horário exato | Alarme ligado, mas pode atrasar | O Android está segurando o horário exato dos alarmes. Toque em Liberar horário exato e ative a opção do BioShield. | Liberar horário exato · Testar o alarme |
| No navegador | Alarme com a tela aberta | No navegador, o alarme toca enquanto o BioShield estiver aberto. No app Android ele toca mesmo com o celular bloqueado. | Testar o alarme |

Embaixo do texto, quando está tudo certo: "Próximo alarme: {remédio}, {quando}." ou "Nenhuma dose nos próximos 2 dias."

Recados (a faixa que aparece embaixo da tela por alguns segundos):

| Quando | Recado |
|---|---|
| Dose confirmada pelo alarme | Dose de {remédio} confirmada. |
| A dose já tinha sido confirmada antes | Essa dose já estava confirmada. |
| O servidor recusou a confirmação | Não consegui confirmar. {motivo} |
| Lembrar em 5 min | Vou lembrar de novo em 5 minutos. |
| Teste no app | O alarme de teste toca em 5 segundos. Pode bloquear a tela para conferir. |
| Teste no navegador | O alarme de teste toca em 5 segundos. |
| Tomei ou Lembrar no teste | Teste concluído. O alarme está funcionando. |
| Permissão concedida pelo cartão | Alarme ligado. |
| Permissão negada pelo cartão | O celular não deixou ligar o alarme. Siga o passo a passo do cartão. |
| Teste sem permissão | O celular não deixou o BioShield mostrar avisos. Veja o cartão do alarme na tela de doses. |

### Outras mensagens novas nas telas

Ficha médica (`frontEnd/js/perfil.js`):

| Quando | Mensagem |
|---|---|
| Alergia com reação, mas sem substância | Escreva a substância da alergia ou toque em Remover nessa linha. |
| Contato sem nome | Escreva o nome do contato de emergência ou toque em Remover nessa linha. |
| Contato sem telefone | Escreva o telefone de {nome}, com DDD. |
| Telefone com tamanho errado | O telefone de {nome} precisa ter DDD e 10 ou 11 números. |
| Conta que já tem ficha criada em outro aparelho | Esta conta já tem uma ficha salva. Toque em Sair e entre de novo para carregar ela. |
| Ficha não carregou, sem servidor | Não consegui falar com o servidor. Confira a internet ou o endereço do servidor e tente de novo. |
| Ficha não carregou, sem acesso | Esta conta não tem acesso a essa ficha. Toque em Sair e entre de novo. |
| Ficha não carregou, outro motivo | Não consegui carregar a sua ficha agora. {motivo} |

Junto com os três últimos aparece o botão **Tentar de novo**.

Doses (`frontEnd/js/doses.js`), no resumo da adesão de hoje, quando tem dose confirmada antes da hora: "1 dose confirmada antes da hora entra na conta quando o horário dela chegar" ou "{n} doses confirmadas antes da hora entram na conta quando o horário delas chegar".

## O QR Code dentro do app

O QR guarda o endereço completo da ficha no servidor, por exemplo `http://192.168.0.10:3000/pages/emergencia.html?token=...`. Ele nunca sai com `localhost` nem com o endereço interno do celular: o próprio servidor informa o endereço de rede dele.

Consequência: o QR só abre para quem estiver no mesmo wifi do servidor. Para abrir no 4G seria preciso hospedar tudo na internet.

## Testar pelo cabo, sem wifi

Se o celular e o computador estiverem em redes diferentes, dá para testar pelo cabo USB, com a depuração ligada e o backend rodando no próprio computador:

```
adb reverse tcp:3000 tcp:3000
```

O celular passa a enxergar a porta 3000 do computador como se fosse dele, e o app acha o servidor sozinho pelo item 4 da lista de cima. O comando precisa ser repetido quando o cabo for desconectado. O `adb` vem com o Android Studio.

## O que não funciona dentro do app

- **Baixar a imagem do QR e imprimir as etiquetas.** Dependem do navegador. No app os dois botões dão lugar a um recado com o endereço para abrir o BioShield no computador, onde a impressão funciona.
- **Ícone no Android 7.** O ícone do BioShield aparece do Android 8 em diante. No Android 7 fica o ícone padrão do Capacitor.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Android Studio reclama que não acha `capacitor-android` | Faltou o `npm install` na raiz |
| App abre com as telas antigas | Faltou o `npm run app:sync` antes de gerar |
| "O BioShield não respondeu em..." ao salvar o servidor | Celular fora do wifi do servidor, IP errado, firewall do servidor ou roteador isolando os aparelhos |
| App abre no modo demonstração | Nenhum servidor respondeu. Informe o endereço no quadro Servidor |
| Erro de versão do plugin do Android ao abrir o projeto | Android Studio antigo. Atualize |
| `npm run app:sync` dá erro de versão do Node | Node abaixo da 22 |
| O alarme não toca | Notificação bloqueada: veja o cartão do alarme na tela de Doses. Ou o APK foi gerado sem o `npm run app:sync` depois do `npm install`, e o plugin de notificações não entrou |
| O alarme toca atrasado | Celular segurando alarmes para economizar bateria. Deixe o BioShield sem restrição de bateria |
| O alarme toca sem som | Volume de notificação no zero ou modo "Não perturbe" ligado |
| Trocou o som e continua o antigo | O Android guarda o som no canal. Troque também o nome do canal no `lembretes.js` |

## O que vai para o Git

A pasta `android/` vai para o Git. Dentro dela, o próprio Capacitor já ignora a cópia das telas (`android/app/src/main/assets/public`) e as pastas de compilação. Por isso quem clona o repositório precisa rodar `npm install` e `npm run app:sync` antes de abrir o Android Studio.

Não rodem `npx cap add android` de novo: a pasta já existe. Se os dois gerarem de novo, dá conflito.

## O que foi testado e o que não foi

**O APK já foi compilado** pela linha de comando, sem o Android Studio, com o JDK 21 e o Android SDK 36 (o Gradle baixou sozinho o Build Tools 35). O `gradlew assembleDebug` terminou com `BUILD SUCCESSFUL`, e o APK gerado foi conferido por dentro: pacote `br.com.bioshield.app`, Android 7 em diante, permissão de internet, HTTP liberado, as telas iguais às do `frontEnd/`, o plugin `@capacitor/app` registrado e a assinatura de depuração válida.

O que também foi testado:

- as telas, de ponta a ponta, em um navegador com tamanho de celular, contra o servidor de verdade
- o comportamento de app (quadro Servidor, endereço do QR, servidor fora do ar, botão de voltar), simulado no navegador
- o QR Code gerado, lido por um decodificador, apontando para o endereço de rede

O que falta: instalar num celular de verdade. Se algo der errado lá, anotem a mensagem.

## Play Store

É outra etapa: conta paga de desenvolvedor, APK assinado e política específica para app de saúde. Para o Empreenda, o APK instalado direto no celular é suficiente.
