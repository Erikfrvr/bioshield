# Servidor do BioShield no Linux Mint

Como ligar o BioShield em um computador com Linux Mint ligado a um roteador, para os celulares do mesmo wifi usarem o app e abrirem a ficha pelo QR Code.

## Como funciona

Um computador roda tudo: o banco MySQL e o backend em Node.js. O backend atende em uma porta só, a 3000, e por ela entrega três coisas:

- o site (`http://IP:3000`)
- a API que o app Android usa (`http://IP:3000/api`)
- a ficha de emergência que o QR Code abre (`http://IP:3000/pages/emergencia.html`)

O roteador não precisa de internet. Ele só precisa colocar o servidor e os celulares na mesma rede.

## 1. Instalar o Node.js e o MySQL

O Node precisa ser a versão 20 ou mais nova. A que vem no `apt` do Mint costuma ser antiga, então instale pelo NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git mysql-server
node -v
```

O último comando tem que mostrar `v22` ou outra versão de 20 para cima.

## 2. Baixar o projeto

```bash
git clone https://github.com/Erikfrvr/bioshield.git
cd bioshield/backend
npm install
```

## 3. Criar o banco

No Linux o usuário `root` do MySQL só entra com `sudo`, sem senha. Por isso os scripts rodam com `sudo`, e o BioShield usa um usuário próprio, criado no terceiro comando. Troque `uma_senha_aqui` por uma senha sua.

```bash
sudo mysql < ../database/bioshield.sql
sudo mysql < ../database/dados_ficticios.sql
sudo mysql -e "CREATE USER IF NOT EXISTS 'bioshield'@'localhost' IDENTIFIED BY 'uma_senha_aqui'; GRANT ALL PRIVILEGES ON bioshield.* TO 'bioshield'@'localhost'; FLUSH PRIVILEGES;"
```

O primeiro script cria o banco e as tabelas. O segundo coloca os pacientes fictícios da demonstração e pode ser rodado de novo quando quiser voltar ao começo: ele apaga os dados e recria os mesmos, com os mesmos QR Codes.

## 4. Configurar o `.env`

```bash
cp .env.example .env
nano .env
```

Deixe assim, com a senha que você escolheu no passo 3:

```
DB_HOST=127.0.0.1
DB_USER=bioshield
DB_PASSWORD=uma_senha_aqui
DB_NAME=bioshield
DB_PORT=3306
PORT=3000
JWT_SECRET=um_texto_longo_e_so_seu
URL_PUBLICA=
```

Para gerar um `JWT_SECRET` bom: `openssl rand -hex 32`.

O `URL_PUBLICA` pode ficar vazio. O servidor descobre sozinho o endereço dele na rede.

## 5. Ligar

```bash
npm start
```

O terminal mostra algo assim:

```
Servidor rodando em http://localhost:3000
Nos celulares e nos outros computadores da mesma rede, use:
  http://192.168.0.10:3000
Endereco que vai dentro do QR Code: http://192.168.0.10:3000
Conexao com o banco MySQL estabelecida com sucesso.
```

O endereço da segunda parte é o que os alunos usam. Deixe o terminal aberto: fechar o terminal desliga o servidor.

Se aparecer `Nao foi possivel conectar ao banco MySQL`, o problema está no `.env` (usuário ou senha) ou o MySQL está parado (`sudo systemctl start mysql`).

## 6. Testar por um celular

Com o celular no wifi do roteador, abra no navegador o endereço que o terminal mostrou, por exemplo `http://192.168.0.10:3000`. Tem que aparecer a tela de entrada do BioShield.

Contas dos dados fictícios, todas com a senha `123456`:

| Conta | Papel |
|---|---|
| `maria.souza@exemplo.com` | Paciente com remédios, alergias e uma semana de doses em dia |
| `patricia.martins@exemplo.com` | Cuidadora da Maria e do Lucas |
| `joana.lima@exemplo.com` | Paciente com duas alergias graves |
| `lucas.andrade@exemplo.com` | Paciente com doses perdidas |
| `roberto.nunes@exemplo.com` | Paciente com o QR Code cancelado |

## Se o celular não abrir

Confira nesta ordem:

1. **O celular está no wifi do roteador?** No 4G não abre.
2. **O firewall do Mint está barrando?** Veja com `sudo ufw status`. Se estiver ativo, libere a porta: `sudo ufw allow 3000/tcp`.
3. **O roteador isola os aparelhos?** Alguns roteadores têm uma opção chamada isolamento de clientes, isolamento de AP ou rede de convidados, que impede um aparelho do wifi de enxergar o outro. Ela precisa estar desligada.
4. **O servidor está por cabo e os celulares no wifi?** Funciona, desde que seja o mesmo roteador.
5. **O endereço está certo?** Confira com `hostname -I` no servidor.

## O endereço não pode mudar depois de imprimir

O QR Code guarda o endereço inteiro do servidor. Se o roteador der outro IP para o computador depois que os QR Codes forem impressos, nenhum papel abre mais.

Para evitar isso, fixe o IP do servidor no roteador. A opção costuma chamar reserva de DHCP ou IP fixo por MAC. Depois de fixar, reinicie o servidor e confira se o terminal mostra o mesmo endereço.

Se o computador tiver cabo e wifi ligados ao mesmo tempo, o servidor escolhe o endereço da placa que sai para a rede. Se ele escolher o errado, escreva o certo no `.env`:

```
URL_PUBLICA=http://192.168.0.10:3000
```

## No app Android

Na primeira vez, o app mostra na tela de entrada um quadro chamado Servidor. O aluno toca em "Informar o endereço do servidor", escreve o IP (por exemplo `192.168.0.10`) e toca em "Testar e salvar". O app guarda o endereço e não pergunta de novo.

O alarme dos remédios não depende do servidor depois de agendado: o celular toca mesmo fora do wifi. Só a confirmação da dose precisa falar com o servidor.

Como gerar o app está em [`GUIA_APK.md`](GUIA_APK.md).

## Atualizar o projeto

```bash
cd bioshield
git pull
cd backend
npm install
npm start
```

Se a atualização trouxe mudança nas tabelas, o banco precisa ser recriado. Isso apaga tudo que foi cadastrado:

```bash
sudo mysql -e "DROP DATABASE bioshield"
sudo mysql < ../database/bioshield.sql
sudo mysql < ../database/dados_ficticios.sql
```

O usuário `bioshield` do MySQL continua valendo, não precisa criar de novo.

## Manter ligado sem o terminal aberto

Opcional. Para o servidor continuar rodando depois de fechar o terminal:

```bash
nohup npm start > bioshield.log 2>&1 &
```

Para desligar: `pkill -f "tsx server.ts"`.

Vale também desativar a suspensão automática do computador nas configurações de energia do Mint, senão o servidor dorme no meio da aula.

## O que foi testado

A subida do servidor, o site, a API, o QR Code e o app Android foram testados no Windows, com o servidor atendendo pelo endereço de rede. No Linux Mint ainda não rodamos. O código foi conferido no que muda de um sistema para o outro: nomes de arquivo com maiúscula e minúscula, nomes de tabela e fuso horário (com o relógio do computador forçado para UTC, que é o padrão de muitos servidores Linux, os horários das doses continuaram no horário de Brasília). Se algum passo deste guia falhar no Mint, anotem a mensagem do terminal.
