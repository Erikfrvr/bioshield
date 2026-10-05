# Servidor do BioShield na internet com o Tailscale Funnel

Como deixar o BioShield aberto para a internet sem pagar hospedagem. O backend e o MySQL continuam rodando no computador de vocês, do mesmo jeito que rodam hoje. O Tailscale Funnel cria um endereço público com HTTPS que leva até esse computador.

Com isso, o QR Code abre em qualquer celular com internet: no 4G, no wifi de visitantes do Senac ou em casa. O visitante não precisa entrar em wifi nenhum antes de escanear.

## Como funciona

```
celular do visitante  ->  https://bioshield.NOME.ts.net  ->  Tailscale  ->  computador de vocês (porta 3000)  ->  MySQL
```

O Tailscale é um programa que roda no computador. O Funnel é uma função dele que recebe os acessos da internet num endereço fixo terminado em `.ts.net` e repassa para a porta 3000. Não precisa abrir porta no roteador nem mexer no firewall, e o HTTPS já vem pronto.

O que isso exige:

- O computador ligado, com internet e com o backend rodando durante todo o evento. Desligou, a ficha não abre
- Uma conta grátis no Tailscale
- Permissão para instalar programas no computador. Computador de empresa ou de escola costuma bloquear: nesse caso, usem um notebook pessoal ou o computador Linux do professor

## 1. Deixar o BioShield rodando no computador

Antes de tudo, o BioShield precisa estar funcionando localmente. Abra `http://localhost:3000` no navegador do próprio computador e confira se a tela de entrada aparece e se o login com uma conta fictícia funciona.

No Windows, siga o README. No Linux Mint, siga o [`SERVIDOR_LINUX.md`](SERVIDOR_LINUX.md) até o passo 5.

## 2. Criar a conta e instalar o Tailscale

1. Crie a conta em `https://tailscale.com`. Dá para entrar com uma conta Google ou GitHub
2. Instale o Tailscale no computador que vai ser o servidor

No Windows, baixe o instalador em `https://tailscale.com/download`, instale e entre com a conta pelo ícone que aparece perto do relógio.

No Linux Mint:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

O segundo comando mostra um link. Abra no navegador e entre com a conta.

## 3. Escolher o endereço antes de tudo

O endereço público vai ser assim:

```
https://NOME_DA_MAQUINA.NOME_DA_REDE.ts.net
```

Ele vai dentro de todos os QR Codes impressos, então escolham com calma, **antes** de imprimir qualquer coisa. No painel do Tailscale, em `https://login.tailscale.com/admin`:

- **Nome da máquina:** em Machines, nos três pontinhos ao lado do computador, use a opção de editar o nome e deixe `bioshield`. Sem isso, o endereço sai com o nome do computador, que pode ser feio ou mostrar dado da empresa
- **Nome da rede:** em DNS aparece o nome da rede de vocês, algo como `tail1234ab.ts.net`. O Tailscale oferece trocar por um nome mais amigável, sorteado de uma lista. É opcional

## 4. Ligar o Funnel

Com o backend rodando, abra outro terminal.

No Windows (PowerShell):

```powershell
tailscale funnel --bg 3000
```

No Linux Mint:

```bash
sudo tailscale funnel --bg 3000
```

Na primeira vez, o Tailscale avisa que o Funnel ainda não está liberado na conta e mostra um link. Abra o link, aceite as permissões (ele liga sozinho o HTTPS e o Funnel) e rode o comando de novo.

No fim, ele mostra o endereço público, por exemplo:

```
https://bioshield.tail1234ab.ts.net/
|-- proxy http://127.0.0.1:3000
```

O `--bg` deixa o Funnel ligado mesmo depois de fechar o terminal e de reiniciar o computador. Comandos úteis:

| Para | Comando |
|---|---|
| Ver se está ligado e qual é o endereço | `tailscale funnel status` |
| Desligar | `tailscale funnel reset` |

No Linux, coloque `sudo` na frente. Se o PowerShell disser que não conhece o comando `tailscale`, feche e abra o terminal de novo, porque a instalação acabou de colocar o programa no caminho.

Na primeira vez, o endereço pode levar alguns minutos para começar a responder.

## 5. Colocar o endereço no `.env`

O QR Code precisa sair com o endereço público, e não com o da rede local. No `backend/.env`:

```
URL_PUBLICA=https://bioshield.tail1234ab.ts.net
```

Sem barra no fim e sem porta. Reinicie o backend. O terminal tem que mostrar:

```
Endereco que vai dentro do QR Code: https://bioshield.tail1234ab.ts.net
```

## 6. Testar pelo 4G

Este é o teste que importa. Com o wifi do celular **desligado**:

1. Abra o endereço público no navegador do celular. Tem que aparecer a tela de entrada do BioShield
2. Entre com `maria.souza@exemplo.com` e senha `123456`
3. Na tela da ficha, confira se o endereço embaixo do QR começa com `https://` e termina com `.ts.net`
4. Escaneie esse QR com **outro** celular, também no 4G. A ficha de emergência tem que abrir
5. Na aba Privacidade da ficha da Maria, confira se a leitura apareceu

Depois, repitam o passo 4 com um celular no wifi de visitantes do Senac.

## 7. No app Android

Na tela de entrada, toque em "Informar o endereço do servidor" e escreva o endereço **completo, com o `https://` na frente**:

```
https://bioshield.tail1234ab.ts.net
```

Sem o `https://`, o app entende que é um endereço da rede local e tenta a porta 3000, e aí não conecta.

Quem já tinha salvo um endereço de rede local, como `192.168.0.10`, precisa trocar pelo novo.

## 8. Imprimir os QR Codes

Os QR Codes impressos com endereço de rede local (`http://192.168...`) não servem mais. Gerem tudo de novo pela folha de impressão, com o site aberto pelo endereço público, depois do teste do passo 6.

A partir daqui, o endereço não pode mudar. Não troquem o nome da máquina nem o nome da rede no painel do Tailscale, não desinstalem o Tailscale e não troquem de conta. Qualquer uma dessas coisas muda o endereço e todos os papéis param de abrir.

## No dia do evento

- Computador ligado na tomada, com a suspensão automática desligada nas configurações de energia
- Internet funcionando no computador: wifi do Senac, cabo ou o 4G de um celular roteando
- Backend rodando (`npm run dev` ou `npm start`)
- `tailscale funnel status` mostrando o endereço
- Um papel escaneado pelo 4G abrindo a ficha antes de abrir a mesa

Se a internet do computador cair, nenhum QR abre. O plano B continua o mesmo do [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md): vídeo, modo demonstração no notebook e prints.

## Cuidados

- **Só dados fictícios.** O endereço é público, então qualquer pessoa na internet pode chegar na tela de entrada. Nada de dado de saúde real no banco que estiver no ar
- **Troquem o `JWT_SECRET`** do `.env` por um texto longo e só de vocês. No Linux: `openssl rand -hex 32`
- **Desliguem o Funnel depois do evento** com `tailscale funnel reset`, se não forem mais usar
- **O IP no histórico de acessos.** Como o Tailscale entrega o acesso de dentro do próprio computador, o registro da LGPD pode gravar o endereço local no lugar do IP de quem escaneou. Data, hora e o tipo de aparelho continuam certos

## O que foi testado

Ainda nada com o Funnel. Este guia segue o funcionamento do BioShield que já foi testado (o `URL_PUBLICA` no QR Code e o endereço digitado no app) e os comandos da documentação do Tailscale. As regras do plano grátis do Tailscale podem mudar: confiram no site antes do evento. Se algum passo falhar, anotem a mensagem do terminal.
