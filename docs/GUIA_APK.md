# Guia: transformar o BioShield em APK

Como o Erik e a Daiane podem gerar um app Android a partir do front que já existe, e o que cada um precisa fazer.

## A ideia em uma frase

Vamos usar o **Capacitor**, uma ferramenta que pega a pasta `frontEnd/` do jeito que ela está e empacota dentro de um app Android. O front não é reescrito e o backend não muda.

O que o app ganha em relação ao site: ícone na tela do celular e, mais tarde, notificação na hora do remédio mesmo com o app fechado.

## Três coisas para entender antes

**1. O APK não leva o backend junto.**
O app é só o front. A API e o MySQL continuam rodando em um servidor. Hoje o `frontEnd/js/config.js` aponta para `http://localhost:3000/api`, e no celular isso não funciona, porque localhost passa a ser o próprio celular.

**2. A ficha de emergência continua sendo um site.**
Quem escaneia o QR é um estranho que não tem o app. Então a página `emergencia.html` precisa estar publicada na internet. O APK é para o paciente e o cuidador, não para quem socorre.

**3. O campo `URL_PUBLICA_EMERGENCIA` passa a ser obrigatório.**
Hoje ele está vazio no `config.js`, e o front monta o endereço do QR a partir do endereço da própria página. Dentro do app esse endereço é interno do celular, então o QR sairia apontando para um lugar que ninguém consegue abrir. Com o campo preenchido, o QR aponta para o site público.

## Dois caminhos

**Caminho A, demonstração na rede local.** O backend roda no notebook, o celular fica na mesma rede sem fio e o app conversa com o notebook pelo IP. Serve para mostrar o app funcionando em uma apresentação. Não precisa de hospedagem.

**Caminho B, app de verdade.** Backend, banco e front hospedados na internet com HTTPS. O app funciona em qualquer lugar e o QR abre no celular de qualquer pessoa.

Sugestão: façam o Caminho A primeiro para aprender o processo. O Caminho B reaproveita quase tudo, só troca os endereços.

## O que instalar no computador

1. **Node.js**, que vocês já têm. Confiram na documentação do Capacitor qual versão mínima ele exige hoje.
2. **Android Studio**, que já traz o Android SDK e o JDK.
3. Um **celular Android** com o modo desenvolvedor e a depuração USB ligados, ou um emulador criado no Android Studio.

Documentação oficial: https://capacitorjs.com/docs

## Passo a passo do Caminho A

### Passo 1. Preparar o `package.json` da raiz

O Capacitor é instalado na raiz do projeto, não dentro de `backend/`. Já existe um `package.json` na raiz com `bcryptjs` e `jsonwebtoken` repetidos do backend. Esses dois podem sair de lá, porque o backend tem os dele.

### Passo 2. Instalar o Capacitor

Na raiz do projeto:

```
npm install @capacitor/core
npm install -D @capacitor/cli
```

### Passo 3. Iniciar a configuração

```
npx cap init BioShield br.com.bioshield.app --web-dir frontEnd
```

Os três valores são: o nome do app, o identificador do app e a pasta onde está o front. O identificador é único e não deve ser trocado depois, então combinem antes.

Esse comando cria o arquivo `capacitor.config.json` na raiz.

### Passo 4. Adicionar o Android

```
npm install @capacitor/android
npx cap add android
```

Isso cria a pasta `android/` na raiz, com o projeto nativo. Essa pasta vai para o Git.

### Passo 5. Descobrir o IP do notebook

No terminal do Windows:

```
ipconfig
```

Procurem o "Endereço IPv4" da rede sem fio. Vai ser algo parecido com `192.168.0.15`.

### Passo 6. Apontar o front para o notebook

No `frontEnd/js/config.js`, trocar a `URL_API`:

```
URL_API: "http://192.168.0.15:3000/api"
```

Usem o IP de vocês. Esse número muda quando o notebook troca de rede, então precisa ser conferido no dia da apresentação.

### Passo 7. Liberar HTTP no app

Por padrão o app Android só aceita HTTPS. Como o notebook responde em HTTP, é preciso liberar isso no `capacitor.config.json`, só para o Caminho A:

```json
{
  "appId": "br.com.bioshield.app",
  "appName": "BioShield",
  "webDir": "frontEnd",
  "server": {
    "androidScheme": "http",
    "cleartext": true
  }
}
```

No Caminho B esse bloco `server` sai, porque a API vai estar em HTTPS.

### Passo 8. Copiar o front para dentro do app

```
npx cap sync
```

**Esse comando precisa ser repetido toda vez que algo mudar em `frontEnd/`.** Sem ele, o app continua com a versão antiga das telas.

### Passo 9. Abrir no Android Studio e rodar

```
npx cap open android
```

Na primeira vez o Android Studio demora, porque baixa as dependências. Depois é só conectar o celular pelo cabo e apertar o botão de rodar.

### Passo 10. Gerar o arquivo APK

No Android Studio, no menu Build, usem a opção de gerar APK. O nome exato do item muda de uma versão para outra.

O arquivo sai em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Esse é um APK de depuração. Ele serve para instalar direto no celular e apresentar. Para instalar, o celular precisa permitir apps de fonte desconhecida.

### Passo 11. Conferir antes de apresentar

1. O backend está rodando no notebook com `npm run dev`.
2. O MySQL está ligado.
3. Notebook e celular estão na mesma rede.
4. O firewall do Windows está deixando passar a porta 3000.
5. O IP do `config.js` é o IP de hoje.

Se o app abrir e mostrar "Não consegui falar com o servidor", o problema é quase sempre um dos itens 3, 4 ou 5.

## Se o celular e o computador estão em redes diferentes

É o caso do Senac: os computadores ficam na rede por cabo e o celular fica na rede sem fio dos alunos. Uma rede não enxerga a outra, então o passo 5 e o passo 6 não funcionam. Há três saídas.

### Saída 1, a recomendada: pelo cabo USB

O celular fica ligado no computador pelo cabo, com a depuração USB ativada. Um comando faz o celular enxergar a porta 3000 do computador como se fosse dele:

```
adb reverse tcp:3000 tcp:3000
```

Com isso, a `URL_API` volta a ser a de sempre e não depende de IP nem de rede:

```
URL_API: "http://localhost:3000/api"
```

O `adb` vem junto com o Android Studio. Se o terminal não achar o comando, usem o terminal de dentro do próprio Android Studio.

Cuidados:

1. O comando precisa ser repetido toda vez que o cabo for desconectado ou o celular reiniciar.
2. O passo 7, de liberar HTTP, continua valendo.
3. Só funciona com o cabo ligado. Serve para desenvolver e para apresentar com o celular na mesa.
4. O QR não abre no celular de outra pessoa, porque só o celular ligado no cabo enxerga o servidor.

### Saída 2: o computador vira roteador

O Windows tem o "Hotspot móvel" nas configurações de rede, que compartilha a internet do cabo por wifi. O celular conecta nessa rede e passa a enxergar o computador.

Só funciona se o computador tiver placa de wifi, o que computador de mesa geralmente não tem, e se a configuração do Senac não bloquear essa função.

### Saída 3: o celular vira roteador

O celular compartilha a internet dele com o computador pelo cabo, usando a opção "Ancoragem USB" nas configurações do Android. Os dois passam a estar na mesma rede e os passos 5 e 6 voltam a funcionar, usando o IP novo que aparece no `ipconfig`.

O computador passa a usar a internet do celular enquanto isso estiver ligado, então gasta o plano de dados.

### O que não resolve

Nenhuma das três saídas faz o QR abrir no celular de um estranho. Para isso é preciso o Caminho B, com tudo hospedado.

## O que muda no Caminho B

Se o professor deixar um servidor ativo com o BioShield, é este caminho. O app funciona sem cabo em qualquer rede e o QR abre no celular de qualquer pessoa, desde que o servidor tenha endereço público, acessível de fora da rede do Senac.

Para a mesa de QR Codes do evento, leiam o `docs/DIA_DO_EVENTO.md`. Ele lista o que faz o QR parar de funcionar no dia, e a principal regra é: só imprimir depois que o `URL_PUBLICA_EMERGENCIA` estiver com o endereço definitivo.

### Hospedagem

São três coisas para colocar no ar:

1. **O backend**, em um serviço que rode Node.js.
2. **O banco**, em um serviço de MySQL.
3. **O front**, em um serviço de site estático com HTTPS. Pode ser só a pasta `frontEnd/`.

Não sabemos ainda qual hospedagem usar nem se o Senac oferece alguma. Vale perguntar ao professor antes de escolher.

### Ajustes no projeto

1. `URL_API` no `config.js` passa a ser o endereço público da API, com `https`.
2. `URL_PUBLICA_EMERGENCIA` passa a ser o endereço público da página `emergencia.html`.
3. O bloco `server` sai do `capacitor.config.json`.
4. As variáveis do `.env` são cadastradas no painel da hospedagem, com um `JWT_SECRET` novo e forte. O `.env` continua fora do Git.
5. O `cors()` do `server.ts` hoje aceita qualquer origem. Em produção vale restringir para o endereço do site e para a origem do app.

Depois disso, `npx cap sync` e gerar o APK de novo.

## Problemas que já sabemos que vão aparecer

**1. A tela de imprimir etiquetas.**
O `frontEnd/js/imprimir.js` usa `window.print()`, que é a impressão do navegador. Dentro de app Android isso não funciona. Saídas possíveis: abrir essa tela no navegador do celular em vez de dentro do app, ou deixar a impressão só para a versão web no computador.

**2. Telas sem backend.**
Medicamentos, doses e cuidador ainda não têm rota pronta. O app abre, mas essas telas vão dar erro. Para apresentar antes de o backend ficar pronto, o `config.js` tem o `MODO: "demo"`, que usa os dados fictícios do `demo.js` sem precisar de servidor.

**3. Um `config.js` para cada ambiente.**
O endereço da API é diferente no computador, no Caminho A e no Caminho B. Como é um arquivo só, é fácil subir para o Git o endereço errado. Combinem qual valor fica versionado.

**4. Botão de voltar do Android.**
O front foi pensado para navegador. Vale testar o botão de voltar do celular em cada tela, principalmente depois do login.

## Depois que o APK estiver funcionando

**Notificação na hora do remédio.** É o maior ganho do app em relação ao site. O Capacitor tem um plugin oficial de notificação local (`@capacitor/local-notifications`). A ideia é: quando o app carrega a agenda de doses, ele agenda um aviso para cada dose do dia. Isso depende de a agenda de doses estar pronta no backend. As versões novas do Android pedem permissão ao usuário para mostrar notificação, e a documentação do plugin explica como pedir.

**Ícone e nome.** Trocar o ícone padrão pelo do BioShield, com o teal `#0E3C39` de fundo.

**Play Store.** É outra etapa: conta paga de desenvolvedor, APK assinado e política específica para app de saúde. Para o Empreenda, o APK instalado direto no celular é suficiente.

## Quem faz o quê

É uma sugestão, seguindo a divisão do roadmap. Ajustem como preferirem.

**Erik**

1. Limpar o `package.json` da raiz e instalar o Capacitor (passos 1 a 4).
2. Configurar o `capacitor.config.json` e gerar o primeiro APK (passos 7 a 10).
3. Terminar o controller e a rota de emergência, para o QR abrir a ficha de verdade.
4. Cuidar da hospedagem no Caminho B.

**Daiane**

1. Instalar o Android Studio e conseguir rodar o projeto na máquina dela (passo 9).
2. Terminar medicamentos e doses no backend, que são a base da notificação.
3. Testar todas as telas no celular e anotar o que quebra: botão de voltar, tamanho de fonte, impressão.
4. Estudar o plugin de notificação local.

**Juntos**

1. Combinar o identificador do app antes do passo 3.
2. Rodar `npx cap add android` em uma máquina só e subir a pasta `android/` para o Git. Se os dois rodarem, dá conflito.
3. Decidir o que fazer com a tela de imprimir.
4. Decidir a hospedagem.

## Ordem recomendada

1. Terminar a rota de emergência no backend.
2. Fazer o Caminho A e ver o app abrir no celular.
3. Terminar medicamentos, doses e cuidador.
4. Fazer o Caminho B.
5. Adicionar a notificação.

## Perguntas para o professor

1. O Senac oferece hospedagem para o backend e para o MySQL?
2. Para o Empreenda, o app precisa estar na Play Store ou basta o APK instalado no celular?
3. Ele recomenda outra ferramenta no lugar do Capacitor?
