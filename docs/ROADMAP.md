# Roadmap do BioShield

Como o projeto foi construído, fase por fase, e o que ainda falta. Cada fase dependia da anterior, e quase todas estão fechadas. O que sobrou é, principalmente, a preparação do dia do evento.

## Como a dupla trabalhou

O projeto foi feito em fatias verticais: um domínio inteiro de cada vez, do value object até a rota, testado no `requests.http` antes de começar o próximo. Cada fase teve um dono, que escrevia, e o outro revisava. Assim os dois nunca editavam o mesmo arquivo no mesmo dia.

As telas ficaram prontas antes do backend, então o trabalho no backend foi dividido em três tempos:

- **O molde.** O Erik fez sozinho o cadastro e o login (Fases 3 e 4), que viraram o padrão de todas as outras camadas. Enquanto isso, a Daiane preparou o que não dependia do molde: o ajuste do banco para o cancelamento do QR, as consultas de remédios e doses testadas no Workbench e os blocos do `requests.http`.
- **Em paralelo.** O Erik ficou com a ficha médica e o QR Code, que são o caminho crítico do produto. A Daiane ficou com remédios e doses, uma fatia fechada que não esbarra no QR.
- **O que sobrou.** O modo cuidador e o acabamento.

Três arquivos tiveram combinado próprio, porque os dois precisavam deles: o `server.ts` recebeu de uma vez os seis routers na Fase 3 e ninguém mais mexeu nele; as bibliotecas foram instaladas juntas, num commit só, para não brigar no `package-lock.json`; e o `requests.http` foi dividido em seções por domínio.

## Situação de cada marco

| Marco | O que prova | Dono | Situação |
|---|---|---|---|
| 0 | Ambiente pronto | os dois | Feito |
| 1 | Banco criado | os dois | Feito |
| 2 | API no ar | Erik | Feito |
| 2.5 | Banco pronto para o cancelamento do QR | Daiane | Feito |
| 3 | Cadastro funcionando | Erik | Feito |
| 4 | Login e rotas protegidas | Erik | Feito |
| 5 | Ficha médica salvando | Erik | Feito |
| 6 | QR Code abrindo a ficha | Erik e Daiane | Feito |
| 7 | Lembrete de dose de ponta a ponta | Daiane | Feito |
| 8 | Backend completo | Daiane | Feito |
| 9 | App navegável | os dois | Feito |
| 10 | Testes do Jest passando | Daiane e Erik | Feito |
| 11 | App Android com alarme dos remédios | os dois | Feito |
| 12 | Demonstração e mesa de QR Codes | os dois | Falta |

## O que ainda falta

Para o evento (detalhes em [`DIA_DO_EVENTO.md`](DIA_DO_EVENTO.md)):

- [ ] Montar o servidor no notebook do Erik com o Tailscale Funnel, seguindo o [`SERVIDOR_ONLINE.md`](SERVIDOR_ONLINE.md)
- [ ] Escolher o nome da máquina no Tailscale, para o endereço não mudar depois de imprimir
- [ ] Abrir uma ficha com o celular no 4G, antes de gerar qualquer QR
- [ ] Trocar a senha das contas fictícias, porque o endereço fica aberto na internet
- [ ] Gerar e imprimir os QR Codes só depois disso, e testar cada papel com dois celulares
- [ ] Separar um paciente com QR cancelado para mostrar o aviso
- [ ] Imprimir a folha de etiquetas e colar uma num chaveiro para a demonstração · Erik
- [ ] Gravar o vídeo do fluxo completo: cadastro, ficha, QR, escanear com o celular, remédio, alarme e dose · Erik
- [ ] Gravar o corte do cancelamento: escaneia e abre, cancela no app, escaneia de novo e aparece o aviso · Erik
- [ ] Deixar o plano B pronto: vídeo, modo demonstração no notebook e prints

O corte do cancelamento é o melhor plano do vídeo: é ele que mostra que existe um produto pensado ali, e não só um cadastro com QR Code em cima.

Testes num celular de verdade:

- [ ] Abrir a ficha de emergência pelo QR no celular de um visitante, pelo 4G
- [ ] Passar pelas telas do app num celular físico, com a letra no tamanho máximo
- [ ] Conferir o botão Voltar do Android em cada tela
- [ ] Conferir o alarme dos remédios com a tela bloqueada num celular de marca (Samsung, Motorola ou Xiaomi), que é onde a economia de bateria pode atrasar alarmes

No banco:

- [ ] Quem criou o banco antes da agenda de doses virar índice único precisa rodar o `ALTER TABLE doses` que está no [`CONTRATO_API.md`](../frontEnd/CONTRATO_API.md). Banco criado do zero pelo `bioshield.sql` atual já está certo

## As fases

### Fase 0. Preparar o terreno

Repositório no GitHub, esqueleto de pastas, `.gitignore` pegando `node_modules/` e `.env`, dependências instaladas e o banco vazio criado. **Feito.**

### Fase 1. Banco de dados

As oito tabelas do `database/bioshield.sql` (`usuarios`, `pacientes`, `alergias`, `contatos_emergencia`, `medicamentos`, `doses`, `cuidador_paciente` e `acessos_qr`, este último para o registro da LGPD), com chaves estrangeiras em cascata e índice único no token do QR. O script foi rodado do zero num banco limpo. **Feito.**

### Fase 2. Fundação do backend

Pool do mysql2 com teste de conexão na subida, Express com cors e JSON, e a rota `GET /api/status`. Essa rota começou como teste e virou peça central: é ela que diz às telas se existe servidor ou se é hora do modo demonstração. **Feito.**

### Fase 2.5. Banco pronto para o cancelamento do QR · Daiane

As colunas `qr_ativo` e `qr_cancelado_em` em `pacientes`, no script e no dicionário de dados. O token não é apagado no cancelamento porque o índice único impede token nulo repetido e porque apagar destruiria o rastro de qual código foi impresso. **Feito.**

### Fase 3. Usuário, a fatia molde · Erik

Value objects `Email` e `Senha`, entidade `Usuario`, DTOs, interface do repositório, SQL, service com hash e checagem de email repetido, controller e rotas. Foi a fase mais importante: virou o molde de todas as outras. **Feito.**

### Fase 4. Autenticação · Erik

Login comparando o hash, token JWT com o id do usuário, `idPaciente` na resposta do login (para as telas não precisarem de uma rota extra só para descobrir a ficha), middleware de autenticação e o `AutorizacaoService`, que decide quem vê os dados de qual paciente. Só a rota de status e a de emergência ficaram públicas. **Feito.**

### Fase 5. Ficha médica · Erik

Value objects `Telefone` e `TipoSanguineo`, entidades `Alergia`, `ContatoEmergencia` e `Paciente`, o SQL com as listas, o PUT com substituição completa de alergias e contatos dentro de uma transação, e o código de autorização do cuidador (`POST /pacientes/:id/codigo`), com validade de 24 horas. O código do cuidador ficou nesta fase, e não na do cuidador, porque mexe no controller de paciente. **Feito.**

### Fase 6. QR Code e emergência · Erik e Daiane

Token aleatório de 128 bits, rotação, cancelamento e reativação (que gera token novo: se o chaveiro perdido voltasse a abrir, cancelar não teria servido para nada). A ficha de emergência sai pela entidade `FichaEmergencia`, que ordena alergias por gravidade e contatos por prioridade e mostra só remédio em uso. Token que não existe dá 404 e token cancelado dá 410, cada um com sua tela. Toda leitura fica em `acessos_qr`. O backend não gera imagem de QR: as telas têm gerador próprio, sem biblioteca. **Feito.**

### Fase 7. Remédios · Daiane

Value objects `Dosagem` e `HorarioDose`, entidade `Medicamento`, o SQL (vindo das consultas testadas no Workbench), a próxima dose de cada remédio e o CRUD completo, sempre conferindo o dono da ficha. **Feito.**

### Fase 8. Doses e adesão · Daiane

Entidade `Dose`, agenda gerada no cadastro do remédio e completada antes de cada leitura, tolerância de 60 minutos para a dose virar perdida, confirmação a partir de 60 minutos antes do horário e o "Tomei mesmo assim" para dose perdida. Dose do futuro não entra na adesão, senão o dia começaria em 0% e assustaria a pessoa à toa. As nove decisões de regra estão em [`DUVIDAS_CONTRATO.md`](DUVIDAS_CONTRATO.md). **Feito.**

### Fase 9. Modo cuidador · Daiane

Entidade `Cuidador`, vínculo criado só a partir do código que o paciente gerou, cuidador sempre igual a quem está logado, e o desvínculo que marca a linha como inativa em vez de apagar, porque quem teve acesso a dado de saúde precisa ficar registrado. O cuidador recebe adesão, doses perdidas e próxima dose, nunca a ficha médica nem o histórico de acessos. **Feito.**

### Fase 10. Telas

Oito telas: entrada, cadastro, ficha (com as abas QR Code, Ficha médica e Privacidade), folha de etiquetas, remédios, doses, cuidador e a ficha pública de emergência. Por trás delas, o `api.js` concentra as chamadas, o `ui.js` cuida de sessão, navegação e recados, o `demo.js` responde no modo demonstração e o `qrcode.js` desenha o QR. **Feito.**

### Fase 11. Acabamento e acessibilidade

Letra grande e contraste alto em tudo, recados no lugar de `alert`, estado de carregando, ficha de emergência legível em três segundos com alergia em vermelho, revisão de LGPD no backend (nada de registrar corpo de ficha médica) e o README com prints e instruções.

Para idosos e pessoas com baixa visão, o botão de acessibilidade em todas as telas oferece quatro tamanhos de letra e um contraste reforçado, com a escolha guardada no aparelho. Com a letra grande, os blocos lado a lado viram coluna; foi isso que corrigiu o nome do paciente quebrando letra por letra na ficha de emergência. A leitura em voz alta chegou a ser testada e foi retirada. **Feito.**

### Fase 12. Demonstração

Os dados fictícios do `dados_ficticios.sql` já contam a história da apresentação: a Maria em dia, o Lucas com doses perdidas, a Joana com alergias graves, o Roberto com o QR cancelado e a Patrícia como cuidadora. **Falta** o que está na lista do começo: servidor do evento, QR Codes impressos e vídeo.

### Fase 13. Testes com Jest · Daiane e Erik

Testes no formato da aula (`describe`, `test` e `expect`), com o transformador `@swc/jest`, porque o `ts-jest` não aceitou o TypeScript 7 do projeto. São 8 arquivos e 45 testes, sem banco: `Email`, `Senha`, `TipoSanguineo` e `Telefone` (Erik), `TokenQR`, `Alergia`, `FichaEmergencia` e `Cuidador` (Daiane). Rodam com `npm test` na pasta `backend`. **Feito.**

### Fase 14. App Android

As telas empacotadas com o Capacitor, com ícone e tela de abertura do BioShield, o quadro Servidor na tela de entrada e o QR Code sempre com o endereço de rede do servidor. O passo a passo está em [`GUIA_APK.md`](GUIA_APK.md). **Feito.**

### Fase 15. Versão 1.0

Uma revisão geral do app, de ponta a ponta, antes da apresentação. Ela trouxe:

- o botão Voltar do Android funcionando (antes ele fechava o app em qualquer tela)
- a ficha médica salvando sem alergia ou sem contato (antes o navegador barrava as linhas em branco), avisando quando um contato fica sem telefone e mostrando um aviso claro quando o servidor está fora do ar
- o alarme dos remédios: aviso no celular na hora da dose, repetido a cada 5 minutos até a confirmação, com os botões Tomei e Lembrar em 5 min, funcionando com o app fechado, no servidor e na demonstração
- a rota `GET /api/doses/proximas`, que alimenta o alarme
- o APK compilado e testado num celular virtual, incluindo o alarme com o app fechado

**Feito.**

## Se o tempo apertar

O que pode ser cortado, de trás para frente: o vídeo e a mesa de QR Codes (Fase 12), depois o modo cuidador, depois o acabamento. O que não pode ser cortado de jeito nenhum são as Fases 1 a 6: sem o QR de emergência funcionando, o BioShield vira só mais um app de lembrete de remédio.
