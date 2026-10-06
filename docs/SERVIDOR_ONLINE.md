# Servidor do BioShield na internet com o Tailscale Funnel

Como colocamos o BioShield na internet sem pagar hospedagem. O servidor é o notebook do Erik, levado no dia do evento. O backend e o MySQL rodam nele, do mesmo jeito que no desenvolvimento, e o Tailscale Funnel cria um endereço público com HTTPS que leva até esse notebook.

**Endereço do BioShield:** `https://bioshield.bonito-tench.ts.net`

O endereço está no ar desde 06/10/2026, mas só responde enquanto o notebook estiver ligado, com internet e com o backend rodando.

Com isso, o QR Code abre em qualquer celular com internet: no 4G, no wifi de visitantes do Senac ou em casa. O visitante não precisa entrar em wifi nenhum antes de escanear.

## Situação dos passos

| Passo | Situação |
|---|---|
| 1. BioShield rodando no notebook | Feito em 05/10 |
| 2. Conta e instalação do Tailscale | Feito em 05/10 |
| 3. Nome da máquina e da rede | Feito em 06/10: `bioshield` e `bonito-tench` |
| 4. Funnel ligado | Feito em 06/10 |
| 5. Endereço no `.env` | Feito em 06/10 |
| 6. Teste pelo 4G | Em parte: o app conectou pelo 4G no celular do Erik. Falta escanear um QR com outro celular no 4G |
| 7. App Android | Feito em 06/10: APK novo, com o endereço já escrito na tela de entrada |
| 8. Senha das contas fictícias | Falta |
| 9. Imprimir os QR Codes | Falta |

## Como funciona

```
celular do visitante  ->  https://bioshield.bonito-tench.ts.net  ->  Tailscale  ->  notebook (porta 3000)  ->  MySQL
```

O Tailscale é um programa que roda no notebook. O Funnel é uma função dele que recebe os acessos da internet num endereço fixo terminado em `.ts.net` e repassa para a porta 3000. Não precisa abrir porta no roteador nem mexer no firewall, e o HTTPS já vem pronto.

A grande vantagem para o evento: **o endereço não depende da rede.** O notebook pode estar no wifi do Senac, num cabo ou no 4G de um celular roteando, e o endereço continua o mesmo. Os QR Codes impressos em casa continuam abrindo no dia.

O que isso exige:

- O notebook ligado, com internet e com o backend rodando durante todo o evento. Desligou, a ficha não abre
- Uma conta grátis no Tailscale. Pela documentação dele, o Funnel faz parte de todos os planos, inclusive o grátis
- Permissão para instalar programas no notebook. Por isso o servidor é um notebook pessoal: computador de empresa ou de escola costuma bloquear

Limites do Funnel que valem mesmo no plano grátis: só atende HTTPS, só usa endereço `.ts.net` (domínio próprio não funciona), está em beta e tem um limite de banda que o Tailscale não informa. Para uma mesa de evento isso não deve atrapalhar, mas não dá para garantir com muita gente ao mesmo tempo. As regras podem mudar: vale conferir em `https://tailscale.com/kb/1223/funnel` antes do evento.

## 1. Deixar o BioShield rodando no notebook

Antes de tudo, o BioShield precisa funcionar localmente. No Windows, seguindo o README:

1. No XAMPP, ligue só o **MySQL** (o Apache não é usado)
2. Rode o `database/bioshield.sql` e depois o `database/dados_ficticios.sql`
3. Copie o `backend/.env.example` para `backend/.env` e preencha. Use `DB_HOST=127.0.0.1`, e não `localhost`
4. Na pasta `backend`, rode `npm install` e depois `npm start`

Confira no navegador do próprio notebook:

- `http://localhost:3000` mostra a tela de entrada, e o login com `maria.souza@exemplo.com` funciona
- `http://localhost:3000/api/status` mostra `"banco":"ok"`. Se mostrar `"fora do ar"`, o MySQL não está ligado ou o `.env` está errado: o terminal do backend diz qual dos dois

## 2. Criar a conta e instalar o Tailscale

1. Crie a conta em `https://tailscale.com`. Dá para entrar com uma conta Google ou GitHub
2. Baixe o instalador em `https://tailscale.com/download`, instale e entre com a conta pelo ícone que aparece perto do relógio

No notebook do Erik, instalamos a versão 1.102.4.

## 3. Escolher o endereço antes de tudo

O endereço público tem duas partes:

```
https://NOME_DA_MAQUINA.NOME_DA_REDE.ts.net
```

Ele vai dentro de todos os QR Codes impressos, então tem que ser escolhido com calma, **antes** de imprimir qualquer coisa e **antes** de ligar o Funnel.

**Nome da máquina.** Sem mudar nada, o endereço sai com o nome do Windows (o nosso era `desktop-tl9qnkl`). Trocamos para `bioshield` com um comando, sem precisar do painel:

```powershell
tailscale set --hostname=bioshield
```

**Nome da rede.** O Tailscale começa com um nome sorteado de letras e números (o nosso era `tail516bc2`). No painel, em `https://login.tailscale.com/admin/dns`, a opção **Rename tailnet** oferece nomes mais amigáveis, sorteados de uma lista, e tem um botão que sorteia outra lista quantas vezes quiser. Escolhemos `bonito-tench`: "bonito" é palavra nossa, fácil de lembrar e de ditar.

**Por que antes do Funnel.** Pela documentação do Tailscale (`https://tailscale.com/kb/1217/tailnet-name`), depois que o nome sorteado é usado num certificado HTTPS, ele fica preso à conta e não dá mais para sortear outro. O Funnel usa HTTPS, então a troca do nome tem que vir primeiro.

Se outra conta do Tailscale montar um servidor, o endereço dela vai ser outro. O endereço `bioshield.bonito-tench.ts.net` é da conta do Erik.

## 4. Ligar o Funnel

Com o backend rodando, abra outro PowerShell:

```powershell
tailscale funnel --bg 3000
```

Na primeira vez, o Tailscale avisa que o Funnel ainda não está liberado na conta e mostra um link. Abra o link, aceite (ele liga sozinho o HTTPS e o Funnel) e rode o comando de novo. No fim ele mostra:

```
Available on the internet:

https://bioshield.bonito-tench.ts.net/
|-- proxy http://127.0.0.1:3000

Funnel started and running in the background.
```

O `--bg` deixa o Funnel ligado mesmo depois de fechar o terminal e de reiniciar o notebook. O backend, não: depois de reiniciar, ele precisa ser ligado de novo.

| Para | Comando |
|---|---|
| Ver se está ligado e qual é o endereço | `tailscale funnel status` |
| Desligar | `tailscale funnel reset` |

**Se o PowerShell disser que não conhece o comando `tailscale`.** Foi o que aconteceu com a gente no terminal do VS Code. O instalador põe o programa no caminho do Windows, mas o VS Code tinha sido aberto antes da instalação, e todo terminal aberto dentro dele herda o caminho antigo, mesmo um terminal novo. Fechar e abrir o VS Code inteiro resolve. Sem fechar, dá para chamar pelo caminho completo:

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" funnel --bg 3000
```

Na primeira vez, o endereço pode levar alguns minutos para começar a responder.

## 5. Colocar o endereço no `.env`

O QR Code precisa sair com o endereço público, e não com o da rede local. No `backend/.env`:

```
URL_PUBLICA=https://bioshield.bonito-tench.ts.net
```

Sem barra no fim e sem porta. Se esquecer o `https://`, o servidor coloca sozinho. Depois de mudar o `.env`, reinicie o backend. O terminal tem que mostrar:

```
Tailscale Funnel: confira se ele esta ligado com o comando  tailscale funnel status
  Ele precisa mostrar https://bioshield.bonito-tench.ts.net levando para a porta 3000.
Endereco que vai dentro do QR Code: https://bioshield.bonito-tench.ts.net
```

Se aparecer um aviso sobre o `JWT_SECRET`, troque o valor no `.env` antes de seguir (veja Cuidados, no fim). O nosso já tinha 64 caracteres.

Com o `URL_PUBLICA` preenchido, a tela da ficha monta o QR com o endereço público mesmo que o BioShield seja aberto pelo `localhost` ou pelo IP do wifi. Se o QR sair com endereço que só abre no wifi, a tela da ficha e a tela de etiquetas mostram um aviso.

**Deixar o backend numa janela própria.** Para o dia, o backend fica num PowerShell só dele, com `npm start` na pasta `backend`. Essa janela não pode ser fechada; minimizar não tem problema. Se alguém mexer no código do backend, é preciso fechar e rodar `npm start` de novo, porque esse modo não reinicia sozinho.

## 6. Testar pelo 4G

Este é o teste que importa. Com o wifi do celular **desligado**:

1. Abra `https://bioshield.bonito-tench.ts.net/api/status` no navegador do celular. Tem que aparecer `"status":"ok"` e `"banco":"ok"`
2. Abra o endereço sem o `/api/status`. Tem que aparecer a tela de entrada do BioShield
3. Entre com a conta da Maria
4. Na tela da ficha, confira se o endereço embaixo do QR começa com `https://` e termina com `.ts.net`
5. Escaneie esse QR com **outro** celular, também no 4G. A ficha de emergência tem que abrir
6. Na aba Privacidade da ficha da Maria, confira se a leitura apareceu, com o IP do celular que escaneou

Depois, repitam o passo 5 com um celular no wifi de visitantes do Senac.

O que já conferimos: o `/api/status` e a tela de entrada pelo próprio notebook e por um servidor de fora, pela internet, e o app conectando e entrando na conta pelo 4G no celular do Erik. Faltam os passos 5 e 6.

## 7. No app Android

O app tem o endereço do servidor já escrito. Na primeira vez que ele abre, o quadro **Servidor** aparece no topo da tela de entrada com `bioshield.bonito-tench.ts.net` preenchido. É só tocar em **Testar e salvar** e, quando aparecer "Conectado ao servidor", entrar com a conta.

Isso vale para o APK gerado a partir de 06/10. O app antigo, de antes dessa data, não entendia endereço `.ts.net`, e precisou ser trocado pelo novo. Quem já tinha salvo outro endereço, como o IP da rede local, troca pelo botão **Trocar de servidor**.

O endereço que vem escrito fica no campo `SERVIDOR_SUGERIDO` do `frontEnd/js/config.js`. Se um dia o endereço mudar, é ali que se troca, e o APK precisa ser gerado de novo.

## 8. Trocar a senha das contas fictícias

As contas do `dados_ficticios.sql` usam a senha `123456`, e os emails estão no README. Com o Funnel, qualquer pessoa na internet chega na tela de entrada. Alguém que entrasse como a Maria conseguiria cancelar o QR dela, e o papel da mesa pararia de abrir no meio do evento.

Por isso, depois dos testes e antes de imprimir, troquem a senha de todas as contas fictícias por uma que só a equipe saiba:

1. Na pasta `backend`, gere o hash da senha nova (troque `SenhaDaEquipe#2026` pela de vocês):

   ```powershell
   node -e "require('bcryptjs').hash('SenhaDaEquipe#2026', 10).then(console.log)"
   ```

2. Copie o texto que aparece, começando com `$2b$10$`
3. No phpMyAdmin (`http://localhost/phpmyadmin`, com o Apache ligado só para isso) ou no Workbench, rode no banco `bioshield`, com o hash entre as aspas:

   ```sql
   UPDATE usuarios SET senha = 'COLE_O_HASH_AQUI' WHERE email LIKE '%@exemplo.com';
   ```

4. Confira entrando com a senha nova

**Atenção:** rodar o `dados_ficticios.sql` de novo volta a senha para `123456`. Sempre que rodarem o script (por exemplo na véspera), repitam este passo. Os QR Codes não mudam.

## 9. Imprimir os QR Codes

Os QR Codes impressos com endereço de rede local (`http://192.168...`) não servem. Gerem tudo pela tela de etiquetas, depois do teste do passo 6. A tela mostra um aviso vermelho se o endereço não for o público.

A tela de etiquetas funciona no navegador do notebook e no app. Nos dois dá para imprimir direto ou baixar o PDF da folha A4 no tamanho real, que também serve para levar a uma gráfica.

A partir daqui, o endereço não pode mudar. Não troquem o nome da máquina nem o nome da rede no painel do Tailscale, não desinstalem o Tailscale e não troquem de conta. Qualquer uma dessas coisas muda o endereço, e todos os papéis param de abrir.

## Preparar o notebook para o dia

| O quê | Como | Situação |
|---|---|---|
| Suspensão desligada | Configurações, Sistema, Energia: "Quando conectado, colocar em suspensão após" em **Nunca** | Já estava assim |
| Tampa | Painel de Controle, Opções de Energia, "Escolher a função do fechamento da tampa": **Não fazer nada** para "Conectado". Assim dá para fechar a tampa sem derrubar o servidor | Falta conferir |
| Atualizações pausadas | Configurações, Windows Update, "Pausar atualizações" por uma semana. Uma reinicialização no meio do evento derruba tudo | Fazer na semana do evento |
| MySQL ligando sozinho | No XAMPP, Config, "Autostart of modules": marcar MySQL. Ou alguém da equipe sabendo ligar na hora | Falta |
| Carregador | Na mochila, e um ponto de tomada combinado perto da mesa | No dia |

## No dia do evento

Na ordem:

1. Notebook na tomada e com internet: wifi do Senac, cabo ou o 4G de um celular roteando. Qualquer uma serve, o endereço é o mesmo
2. MySQL ligado no XAMPP
3. Backend rodando (`npm start` na pasta `backend`), numa janela própria
4. `tailscale funnel status` mostrando o endereço
5. `https://bioshield.bonito-tench.ts.net/api/status` no celular, pelo 4G, mostrando `"banco":"ok"`
6. Um papel da mesa escaneado pelo 4G abrindo a ficha

Se a internet do notebook cair, nenhum QR abre. Troquem para o 4G roteado de um celular da equipe: o endereço não muda e tudo volta em alguns segundos. Se nem isso funcionar, o plano B está no [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md).

## Se algo der errado

| O que acontece | O que conferir |
|---|---|
| O endereço `.ts.net` não abre no celular | Internet do notebook, `tailscale funnel status` e se o ícone do Tailscale está conectado |
| Abre a tela, mas nada carrega e o login falha | Abra `/api/status`: se o banco estiver `"fora do ar"`, ligue o MySQL no XAMPP |
| O QR na tela da ficha sai com `http://192.168...` | Falta o `URL_PUBLICA` no `.env`, ou o backend não foi reiniciado depois de preencher |
| O app Android não conecta | O endereço salvo no quadro Servidor tem que ser o `.ts.net`, e não um IP antigo. App de antes de 06/10 precisa ser trocado pelo APK novo |
| O PowerShell não conhece o comando `tailscale` | Feche e abra o VS Code, ou use o caminho completo do programa (passo 4) |
| O terminal avisa do `JWT_SECRET` | Troque o valor no `.env` e reinicie. Todo mundo vai precisar entrar de novo |
| A ficha mostra "QR Code cancelado" num papel da mesa | Alguém cancelou ou trocou o QR dessa conta. O papel precisa ser impresso de novo |

## Cuidados

- **Só dados fictícios, fora as fichas da equipe.** O endereço é público, então qualquer pessoa na internet pode chegar na tela de entrada. As fichas do Erik e da Daiane, que vão para a mesa, têm só o que cada um aceita mostrar. Nenhum outro dado de saúde real no banco que estiver no ar
- **Cadastro aberto.** Qualquer pessoa consegue criar conta enquanto o Funnel estiver ligado. O `dados_ficticios.sql` só recria as contas `@exemplo.com` e não apaga as outras. Para limpar tudo depois do evento, apaguem as contas que não forem da equipe, ou recriem o banco do zero com o `bioshield.sql` e o `dados_ficticios.sql`
- **`JWT_SECRET` forte.** Um texto longo e só de vocês, de 32 letras ou mais. O servidor avisa no terminal se ele ficar com o valor do exemplo ou curto demais
- **Senha das contas fictícias trocada** (passo 8)
- **Desligar o Funnel depois do evento** com `tailscale funnel reset`, se não forem mais usar
- **O IP no histórico de acessos.** O Funnel entrega o acesso de dentro do próprio notebook, mas avisa qual é o IP de quem escaneou. O backend lê esse aviso só quando o acesso vem do próprio notebook, então o histórico da LGPD grava o IP verdadeiro do visitante, e um celular do wifi não consegue inventar um IP

## O que foi testado

No computador de desenvolvimento, antes do Funnel de verdade (05/10):

- O servidor sobe com `URL_PUBLICA` do Tailscale, escrito com ou sem o `https://`, e coloca esse endereço no QR
- O `/api/status` responde com o campo `banco`, e responde rápido mesmo com o MySQL desligado
- O IP de quem escaneou passa certo quando o acesso chega pelo próprio computador com o aviso de IP, do jeito que o Funnel faz
- O app aceita o endereço `.ts.net` com ou sem `https://`
- A ficha escolhe o endereço HTTPS para o QR quando aberta pelo `localhost` ou pelo IP do wifi

Com o Funnel ligado de verdade, no notebook do Erik (06/10):

- `/api/status` com `"banco":"ok"` e a tela de entrada abrindo, pelo próprio notebook e por um servidor de fora, pela internet
- O app no celular do Erik, com o wifi desligado, conectou pelo 4G e entrou na conta
- No celular virtual, o app recém instalado conectou no endereço público com um toque em **Testar e salvar**

Ainda **não** testamos escanear um QR com outro celular no 4G nem conferir o IP dessa leitura na aba Privacidade (passos 5 e 6). Se algum passo falhar, anotem a mensagem do terminal.
