# Roadmap do BioShield

O resumo de como nós, Erik e Daiane, construímos o BioShield entre 11/09 e 06/10/2026, e do que ainda falta para o Empreenda Senac. Aqui fica a visão geral, numa página só. O passo a passo de cada fase, com cada tarefa marcada, está em [`ROADMAP_FASES.md`](ROADMAP_FASES.md).

## Como trabalhamos

Fizemos o projeto em fatias verticais: um domínio inteiro de cada vez, do value object até a rota, testado no `requests.http` antes de começar o próximo. Cada fase teve um dono, que escrevia, e o outro revisava, para os dois nunca editarem o mesmo arquivo no mesmo dia.

As telas ficaram prontas primeiro, com dados fictícios. No backend, o Erik fez sozinho o cadastro e o login (Fases 3 e 4), que viraram o molde de todas as outras camadas; enquanto isso, a Daiane preparou o banco e as consultas de remédios e doses. Depois, em paralelo, o Erik ficou com a ficha médica e o QR Code e a Daiane com os remédios, as doses e o modo cuidador.

## Linha do tempo

As datas saem do histórico do Git. A numeração das fases segue a ordem do plano, por isso a Fase 10 (as telas) aparece cedo na linha do tempo.

| Fase | O que entregamos | Quem | Quando | Situação |
|---|---|---|---|---|
| 0 | Repositório e ambiente prontos | os dois | 11/09 | Feito |
| 1 | Banco de dados com as oito tabelas | os dois | 11/09 a 15/09 | Feito |
| 2 | Servidor de pé, conversando com o banco | Erik | 16/09 | Feito |
| 10 | As oito telas, primeiro com dados fictícios | Erik | 19/09 a 24/09 | Feito |
| 2.5 | Banco pronto para o cancelamento do QR | Daiane | 24/09 | Feito |
| 3 | Cadastro de usuário, o molde das camadas | Erik | 24/09 a 25/09 | Feito |
| 4 | Login, rotas protegidas e quem vê o quê | Erik | 27/09 a 29/09 | Feito |
| 9 | Modo cuidador | Daiane | 28/09 a 02/10 | Feito |
| 5 | Ficha médica e código do cuidador | Erik | 29/09 a 02/10 | Feito |
| 6 | QR Code e ficha de emergência | Erik e Daiane | 29/09 a 01/10 | Feito |
| 7 | Remédios | Daiane | 29/09 a 01/10 | Feito |
| 8 | Doses, tolerância e adesão | Daiane | 01/10 a 02/10 | Feito |
| 11 | Acabamento, LGPD e acessibilidade | Erik | 01/10 a 02/10 | Feito |
| 14 | App Android com o Capacitor | Erik e Daiane | 02/10 a 04/10 | Feito |
| 13 | 45 testes com Jest | Daiane e Erik | 03/10 a 04/10 | Feito |
| 15 | Versão 1.0, com o alarme dos remédios | Erik | 04/10 | Feito |
| 16 | Aviso de dose perdida no celular do cuidador | Erik | 05/10 | Feito |
| 17 | Servidor na internet com o Tailscale Funnel | Erik | 05/10 e 06/10 | Feito, com conferências pendentes |
| 18 | Etiquetas no celular e endereço pronto no app | Daiane e Erik | 05/10 e 06/10 | Feito |
| 12 | Demonstração e mesa de QR Codes | os dois | a partir de 03/10 | Falta |

## Onde estamos

As três funcionalidades do BioShield estão completas e testadas, no site e no app Android: a ficha de emergência pelo QR Code, o alarme dos remédios com confirmação de dose e o modo cuidador, que agora também avisa no celular quando uma dose é perdida.

Desde 06/10, o BioShield está na internet em `https://bioshield.bonito-tench.ts.net`, servido pelo notebook do Erik com o Tailscale Funnel. Com isso, o QR Code abre em qualquer celular com internet, no 4G ou em qualquer wifi, e o app se conecta com um toque, porque o endereço já vem escrito. O endereço só responde enquanto o notebook estiver ligado com o backend rodando.

As etiquetas do QR Code podem ser impressas, salvas em PDF ou baixadas como imagem, tanto no computador quanto no celular.

## O que ainda falta

Para o evento (o plano completo está no [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md)):

- [x] Montar o servidor no notebook do Erik com o Tailscale Funnel
- [x] Escolher o nome da máquina e da rede no Tailscale, para o endereço não mudar depois de imprimir
- [x] Abrir o BioShield pelo 4G antes de gerar qualquer QR
- [ ] Escanear um QR com outro celular no 4G e ver a leitura no histórico de acessos, com o IP de quem escaneou
- [ ] Trocar a senha das contas fictícias, porque o endereço está aberto na internet
- [ ] Gerar e imprimir os QR Codes só depois disso, e testar cada papel com dois celulares
- [ ] Separar o papel do Roberto, com o QR cancelado, para mostrar o aviso
- [ ] Imprimir a folha de etiquetas e colar uma num chaveiro para a demonstração · Erik
- [ ] Gravar o vídeo do fluxo completo: cadastro, ficha, QR, escanear com o celular, remédio, alarme e dose · Erik
- [ ] Gravar o corte do cancelamento: escaneia e abre, cancela no app, escaneia de novo e aparece o aviso · Erik
- [ ] Deixar o plano B pronto: vídeo, modo demonstração no notebook e prints
- [ ] No notebook: MySQL ligando sozinho com o XAMPP, tampa conferida e atualizações do Windows pausadas na semana do evento

Testes que ainda queremos fazer num celular de verdade:

- [ ] Repetir o alarme dos remédios com o app fechado e o botão Tomei, porque o `lembretes.js` e o `login.js` mudaram depois do último teste
- [ ] Conferir o alarme com a tela bloqueada num celular de marca (Samsung, Motorola ou Xiaomi), que é onde a economia de bateria pode atrasar alarmes
- [ ] Mostrar o aviso de dose perdida no celular de um cuidador, com o app fechado

## Se o tempo apertar

O que pode ser cortado, de trás para a frente: o vídeo e a mesa de QR Codes (Fase 12), depois o modo cuidador, depois o acabamento. O que não pode ser cortado de jeito nenhum são as Fases 1 a 6 e a 17: sem o QR de emergência abrindo no celular de qualquer pessoa, o BioShield vira só mais um app de lembrete de remédio.
