# Servidor do BioShield na internet com o Tailscale Funnel

Como deixar o BioShield aberto para a internet sem pagar hospedagem. No Empreenda, o servidor é o notebook do Erik, levado no dia. O backend e o MySQL rodam nele, do mesmo jeito que rodam no desenvolvimento. O Tailscale Funnel cria um endereço público com HTTPS que leva até esse notebook.

Com isso, o QR Code abre em qualquer celular com internet: no 4G, no wifi de visitantes do Senac ou em casa. O visitante não precisa entrar em wifi nenhum antes de escanear.

## Como funciona

```
celular do visitante  ->  https://bioshield.NOME.ts.net  ->  Tailscale  ->  notebook (porta 3000)  ->  MySQL
```

O Tailscale é um programa que roda no notebook. O Funnel é uma função dele que recebe os acessos da internet num endereço fixo terminado em `.ts.net` e repassa para a porta 3000. Não precisa abrir porta no roteador nem mexer no firewall, e o HTTPS já vem pronto.

A grande vantagem para o evento: **o endereço não depende da rede.** O notebook pode estar no wifi do Senac, num cabo ou no 4G de um celular roteando, e o endereço continua o mesmo. Os QR Codes impressos em casa continuam abrindo no dia.

O que isso exige:

- O notebook ligado, com internet e com o backend rodando durante todo o evento. Desligou, a ficha não abre
- Uma conta grátis no Tailscale. Pela documentação dele, o Funnel faz parte de todos os planos, inclusive o grátis
- Permissão para instalar programas no notebook. Por isso o servidor é um notebook pessoal: computador de empresa ou de escola costuma bloquear

Limites do Funnel que valem mesmo no plano grátis: só atende HTTPS, só usa endereço `.ts.net` (domínio próprio não funciona), está em beta e tem um limite de banda que o Tailscale não informa o valor. Para uma mesa de evento isso não deve atrapalhar, mas não dá para garantir com muita gente ao mesmo tempo. As regras podem mudar: confiram em `https://tailscale.com/kb/1223/funnel` antes do evento.

## 1. Deixar o BioShield rodando no notebook

Antes de tudo, o BioShield precisa funcionar localmente. No Windows, siga o README:

1. No XAMPP, ligue só o **MySQL** (o Apache não é usado)
2. Rode o `database/bioshield.sql` e depois o `database/dados_ficticios.sql`
3. Copie o `backend/.env.example` para `backend/.env` e preencha. Use `DB_HOST=127.0.0.1`, e não `localhost`
4. Na pasta `backend`, rode `npm install` e depois `npm run dev`

Confira no navegador do próprio notebook:

- `http://localhost:3000` mostra a tela de entrada, e o login com `maria.souza@exemplo.com` e senha `123456` funciona
- `http://localhost:3000/api/status` mostra `"banco":"ok"`. Se mostrar `"fora do ar"`, o MySQL não está ligado ou o `.env` está errado: o terminal do backend diz qual dos dois

## 2. Criar a conta e instalar o Tailscale

1. Crie a conta em `https://tailscale.com`. Dá para entrar com uma conta Google ou GitHub
2. Baixe o instalador em `https://tailscale.com/download`, instale e entre com a conta pelo ícone que aparece perto do relógio

## 3. Escolher o endereço antes de tudo

O endereço público vai ser assim:

```
https://NOME_DA_MAQUINA.NOME_DA_REDE.ts.net
```

Ele vai dentro de todos os QR Codes impressos, então escolham com calma, **antes** de imprimir qualquer coisa. No painel do Tailscale, em `https://login.tailscale.com/admin`:

- **Nome da máquina:** em Machines, nos três pontinhos ao lado do notebook, use a opção de editar o nome e deixe `bioshield`. Sem isso, o endereço sai com o nome do notebook
- **Nome da rede:** em DNS aparece o nome da rede de vocês, algo como `tail1234ab.ts.net`. O Tailscale oferece trocar por um nome mais amigável, sorteado de uma lista. É opcional

## 4. Ligar o Funnel

Com o backend rodando, abra outro PowerShell:

```powershell
tailscale funnel --bg 3000
```

Na primeira vez, o Tailscale avisa que o Funnel ainda não está liberado na conta e mostra um link. Abra o link, aceite as permissões (ele liga sozinho o HTTPS e o Funnel) e rode o comando de novo.

No fim, ele mostra o endereço público, por exemplo:

```
https://bioshield.tail1234ab.ts.net/
|-- proxy http://127.0.0.1:3000
```

O `--bg` deixa o Funnel ligado mesmo depois de fechar o terminal e de reiniciar o notebook. Comandos úteis:

| Para | Comando |
|---|---|
| Ver se está ligado e qual é o endereço | `tailscale funnel status` |
| Desligar | `tailscale funnel reset` |

Se o PowerShell disser que não conhece o comando `tailscale`, feche e abra o terminal de novo, porque a instalação acabou de colocar o programa no caminho.

Na primeira vez, o endereço pode levar alguns minutos para começar a responder.

## 5. Colocar o endereço no `.env`

O QR Code precisa sair com o endereço público, e não com o da rede local. No `backend/.env`:

```
URL_PUBLICA=https://bioshield.tail1234ab.ts.net
```

Sem barra no fim e sem porta. Se esquecer o `https://`, o servidor coloca sozinho. Reinicie o backend. O terminal tem que mostrar:

```
Tailscale Funnel: confira se ele esta ligado com o comando  tailscale funnel status
Endereco que vai dentro do QR Code: https://bioshield.tail1234ab.ts.net
```

Se aparecer um aviso sobre o `JWT_SECRET`, troque o valor no `.env` antes de seguir (veja Cuidados, no fim).

Com o `URL_PUBLICA` preenchido, a tela da ficha monta o QR com o endereço público mesmo que vocês abram o BioShield pelo `localhost` ou pelo IP do wifi. Se o QR sair com endereço que só abre no wifi, a tela da ficha e a folha de impressão mostram um aviso.

## 6. Testar pelo 4G

Este é o teste que importa. Com o wifi do celular **desligado**:

1. Abra `https://bioshield.tail1234ab.ts.net/api/status` no navegador do celular. Tem que aparecer `"status":"ok"` e `"banco":"ok"`
2. Abra o endereço público sem o `/api/status`. Tem que aparecer a tela de entrada do BioShield
3. Entre com `maria.souza@exemplo.com` e senha `123456`
4. Na tela da ficha, confira se o endereço embaixo do QR começa com `https://` e termina com `.ts.net`
5. Escaneie esse QR com **outro** celular, também no 4G. A ficha de emergência tem que abrir
6. Na aba Privacidade da ficha da Maria, confira se a leitura apareceu, com o IP do celular que escaneou

Depois, repitam o passo 5 com um celular no wifi de visitantes do Senac.

## 7. No app Android

Na tela de entrada, toque em "Informar o endereço do servidor" e escreva o endereço do Funnel:

```
bioshield.tail1234ab.ts.net
```

Pode escrever com ou sem o `https://`: endereço terminado em `.ts.net` vira HTTPS sozinho, sem porta. Quem já tinha salvo um endereço de rede local, como `192.168.0.10`, precisa trocar pelo novo no botão "Trocar de servidor". Não precisa gerar o APK de novo.

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

Os QR Codes impressos com endereço de rede local (`http://192.168...`) não servem. Gerem tudo pela folha de impressão, depois do teste do passo 6. A folha mostra um aviso vermelho se o endereço não for o público.

A partir daqui, o endereço não pode mudar. Não troquem o nome da máquina nem o nome da rede no painel do Tailscale, não desinstalem o Tailscale e não troquem de conta. Qualquer uma dessas coisas muda o endereço e todos os papéis param de abrir.

## Preparar o notebook para o dia

No Windows:

- **Suspensão desligada.** Configurações, Sistema, Energia: "Quando conectado, colocar em suspensão após" em **Nunca**
- **Tampa.** Painel de Controle, Opções de Energia, "Escolher a função do fechamento da tampa": em **Não fazer nada** para "Conectado". Assim dá para fechar a tampa sem derrubar o servidor
- **Atualizações pausadas.** Configurações, Windows Update, "Pausar atualizações" por uma semana. Uma reinicialização no meio do evento derruba tudo
- **Carregador** na mochila e um ponto de tomada combinado perto da mesa
- **XAMPP** configurado para ligar o MySQL ao abrir, ou alguém da equipe sabendo ligar na hora

## No dia do evento

Na ordem:

1. Notebook na tomada e com internet: wifi do Senac, cabo ou o 4G de um celular roteando. Qualquer uma serve, o endereço é o mesmo
2. MySQL ligado no XAMPP
3. Backend rodando (`npm start` na pasta `backend`)
4. `tailscale funnel status` mostrando o endereço
5. `https://bioshield.tail1234ab.ts.net/api/status` no celular, pelo 4G, mostrando `"banco":"ok"`
6. Um papel da mesa escaneado pelo 4G abrindo a ficha

Se a internet do notebook cair, nenhum QR abre. Troquem para o 4G roteado de um celular da equipe: o endereço não muda e tudo volta em alguns segundos. Se nem isso funcionar, o plano B está no [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md).

## Se algo der errado

| O que acontece | O que conferir |
|---|---|
| O endereço `.ts.net` não abre no celular | Internet do notebook, `tailscale funnel status` e se o ícone do Tailscale está conectado |
| Abre a tela, mas nada carrega e o login falha | Abra `/api/status`: se o banco estiver `"fora do ar"`, ligue o MySQL no XAMPP |
| O QR na tela da ficha sai com `http://192.168...` | Falta o `URL_PUBLICA` no `.env`, ou o backend não foi reiniciado depois de preencher |
| O app Android não conecta | Endereço salvo no quadro Servidor. Tem que ser o `.ts.net`, e não o IP antigo |
| O terminal avisa do `JWT_SECRET` | Troque o valor no `.env` e reinicie. Todo mundo vai precisar entrar de novo |
| A ficha mostra "QR Code cancelado" num papel da mesa | Alguém cancelou ou trocou o QR dessa conta. O papel precisa ser impresso de novo |

## Cuidados

- **Só dados fictícios.** O endereço é público, então qualquer pessoa na internet pode chegar na tela de entrada. Nada de dado de saúde real no banco que estiver no ar
- **Cadastro aberto.** Qualquer pessoa consegue criar conta enquanto o Funnel estiver ligado. Depois do evento, rodar o `dados_ficticios.sql` limpa tudo
- **Troquem o `JWT_SECRET`** do `.env` por um texto longo e só de vocês, de 32 letras ou mais. O servidor avisa no terminal se ele ficar com o valor do exemplo ou curto demais
- **Troquem a senha das contas fictícias** (passo 8)
- **Desliguem o Funnel depois do evento** com `tailscale funnel reset`, se não forem mais usar
- **O IP no histórico de acessos.** O Funnel entrega o acesso de dentro do próprio notebook, mas avisa qual é o IP de quem escaneou. O backend lê esse aviso só quando o acesso vem do próprio notebook, então o histórico da LGPD grava o IP verdadeiro do visitante, e um celular do wifi não consegue inventar um IP

## O que foi testado

No computador de desenvolvimento, sem o Funnel de verdade:

- O servidor sobe com `URL_PUBLICA` do Tailscale, escrito com ou sem o `https://`, e coloca esse endereço no QR
- O `/api/status` responde com o campo `banco`, e responde rápido mesmo com o MySQL desligado
- O IP de quem escaneou passa certo quando o acesso chega pelo próprio computador com o aviso de IP, do jeito que o Funnel faz
- O app aceita o endereço `.ts.net` com ou sem `https://`
- A ficha escolhe o endereço HTTPS para o QR quando aberta pelo `localhost` ou pelo IP do wifi

Ainda **não** foi testado com o Funnel ligado de verdade nem pelo 4G. Esse é o passo 6, e tem que ser feito no notebook do evento. Se algum passo falhar, anotem a mensagem do terminal.
