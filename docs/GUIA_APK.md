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

Só vale o endereço que responder em `/api/status`.

## Botão de voltar do Android

Sem plugin, o Capacitor fecha o app no primeiro toque em Voltar, em qualquer tela. Por isso o projeto usa o plugin oficial `@capacitor/app` (já está no `package.json` da raiz), e o `frontEnd/js/ui.js` decide o que o Voltar faz:

1. se tem uma janela aberta (cancelar QR Code, novo remédio), ela fecha
2. se dá para voltar, volta para a tela anterior
3. na primeira tela, fecha o app

O `npm run app:sync` registra o plugin no projeto Android sozinho. O comportamento foi testado no navegador simulando o aviso que o Android manda, ainda não num celular. Se nenhum responder, o app entra no **modo demonstração**, com dados fictícios, e avisa isso na tela. Quem já está logado em uma conta de verdade não cai na demonstração: vê o aviso de que não conseguiu falar com o servidor.

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
- **Notificação na hora do remédio.** Ainda não existe. O caminho é o plugin oficial `@capacitor/local-notifications`.
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
