# BioShield

Contexto permanente do projeto. Leia este arquivo antes de escrever qualquer código aqui.

## O que é o app

BioShield é um app de saúde preventiva e segurança medicamentosa. Ele resolve dois momentos:

1. **A emergência.** A pessoa desmaia, tem uma crise ou se perde e não consegue falar por si. Quem chega primeiro não é o socorrista, é um estranho. O app gera um QR Code que essa pessoa escaneia e vê, na hora, as alergias a medicamento, os remédios em uso, o tipo sanguíneo e o contato de quem avisar.
2. **O dia a dia.** Lembrete de remédio com confirmação de dose, e um modo cuidador que deixa o familiar acompanhar de longe se as doses estão sendo tomadas.

O projeto nasceu no Empreenda Senac 2026 (categoria Cursos Técnicos) e é software puro: o usuário gera o próprio QR Code, sem pulseira, sem hardware obrigatório.

## Para quem

- Idosos
- Pessoas com doenças crônicas
- Pessoas com alergia severa a medicamento
- Pessoas autistas de maior necessidade de suporte, com risco de se perder
- Cuidadores e familiares dessas pessoas

Consequência prática disso no código: fonte grande, contraste alto, poucos passos por tela e nada de jargão. A ficha de emergência tem que ser lida em três segundos, no aperto, no celular de outra pessoa.

## As três funcionalidades

**QR Code de emergência.** Token aleatório ligado à ficha do paciente. A rota que ele abre é pública, não pede login e não pede instalação de app. O token é rotativo: o usuário pode gerar um novo e invalidar o anterior a qualquer momento.

**Lembrete de medicamentos.** O usuário cadastra o remédio com dosagem, frequência e horário inicial. O sistema gera a agenda de doses. A pessoa confirma que tomou, e disso sai o percentual de adesão.

**Modo cuidador.** O paciente gera um código de autorização, o cuidador usa esse código para criar o vínculo. O cuidador vê acompanhamento (próxima dose, doses perdidas, adesão da semana). O cuidador não edita a ficha médica.

## Stack

- Backend: Node.js com Express e TypeScript, rodando com tsx
- Banco: MySQL, acessado com mysql2 usando pool de conexão
- Front: HTML, CSS e JavaScript puro por enquanto
- Sem ORM. SQL escrito na mão, só dentro da camada infrastructure

Quando precisar de senha com hash, token de sessão ou geração de imagem do QR, instale na hora: bcryptjs, jsonwebtoken e qrcode. Ainda não estão no package.json de propósito.

## Como rodar

```
cd backend
npm install
cp .env.example .env
npm run dev
```

Variáveis do backend: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `JWT_SECRET`.
Variável do front: `PATH_API`.

O `.env` real nunca vai para o Git.

## Arquitetura

Mesmo padrão em camadas do projeto da aula (DDD com Clean Architecture). O caminho de uma requisição é sempre este:

```
rota  ->  controller  ->  service  ->  infrastructure  ->  banco
                            |
                            v
                  entidade + value object
```

O que cada camada pode e não pode fazer:

| Camada | Faz | Nunca faz |
|---|---|---|
| `routes/` | Aponta o caminho HTTP para o controller | Lógica, validação, banco |
| `controllers/` | Lê req, chama o service, devolve res e status code | Regra de negócio, SQL |
| `services/` | Regra de negócio, monta entidades, valida, orquestra | Falar com `req`/`res`, escrever SQL |
| `repository/` | Interface: o contrato do que o service precisa do banco | Implementação |
| `infrastructure/` | Implementa a interface com SQL do MySQL | Regra de negócio |
| `models/entidade/` | Objeto de domínio com atributos privados, getters e setters | Conhecer banco ou HTTP |
| `models/valueObjects/` | Validação de um valor único (email, telefone, dosagem) | Depender de outra camada |
| `models/dto/` | Formato de entrada e saída de dados | Ter comportamento |

Regra da dependência: a seta só aponta para dentro. O service conhece a interface do repository, nunca a implementação concreta. O controller nunca importa infrastructure direto.

## Estrutura de pastas

```
BioShield/
├── CLAUDE.md
├── backend/
│   ├── server.ts
│   ├── requests.http
│   ├── config/            conexão com o banco
│   ├── routes/            caminhos da API
│   ├── controllers/       entrada e saída HTTP
│   ├── services/          regra de negócio
│   ├── repository/        interfaces dos repositórios
│   ├── infrastructure/    implementações MySQL
│   └── models/
│       ├── entidade/      objetos de domínio
│       ├── valueObjects/  valores validados
│       └── dto/           contratos de entrada e saída
├── database/              script SQL do banco
└── frontEnd/
    ├── index.html         login
    ├── js/
    └── pages/
```

## Convenções de código

- Código e comentários em português
- Entidade, value object, service e interface de repository em PascalCase: `PacienteService.ts`
- Controller, rota e infrastructure em camelCase: `pacienteController.ts`
- DTO sempre com sufixo `DTO`, agrupado em subpasta por domínio
- Service é uma classe exportada como instância única no fim do arquivo (`const pacienteService = new PacienteService(); export default pacienteService;`)
- Infrastructure exporta a classe nomeada e a instância padrão
- Toda query usa `?` como parâmetro, nunca concatenação de string
- Toda conexão pega do pool é liberada no `finally`
- Erro do service sobe com mensagem clara; o controller traduz para status code

## Regras de domínio que não podem ser quebradas

- A rota de emergência é a única sem autenticação
- O que sai na ficha de emergência é exatamente o que está declarado no `FichaEmergenciaResponseDTO`. Se um campo não está lá, ele não vaza. Nada de email, senha, histórico completo ou endereço
- Senha nunca aparece em resposta da API, em log ou em console
- Dado de saúde é dado sensível pela LGPD: não logar corpo de requisição da ficha médica, não versionar dado real de teste, e todo acesso à ficha pública fica registrado
- Tipo sanguíneo e alergia passam por validação forte. Errar esse dado aqui não é bug de formulário, é risco real
- Cuidador só enxerga um paciente depois de um vínculo autorizado pelo próprio paciente

## Identidade visual

- Teal escuro `#0E3C39`
- Coral `#E8604C`
- Menta `#E3F1EC`

Sem gradiente, sem contorno preto, layout limpo. Alergia sempre em destaque vermelho na ficha de emergência.

## Como trabalhar comigo

- Fale português do Brasil
- Nunca use hífen em nenhuma palavra ou frase de texto escrito
- Entregue arquivo completo e pronto para colar, não trecho solto nem "mude a linha 42"
- Não apague o que já existe no arquivo para encaixar o novo
- Explique de forma didática, como conversa normal
- Não invente dado de validação, número de pesquisa ou estatística. Se não souber, diga que não sabe

## O que não fazer neste repositório

- Não pule camada para "ficar mais rápido"
- Não coloque SQL fora de `infrastructure/`
- Não crie ORM nem troque a stack sem eu pedir
- Não preencha os arquivos vazios por conta própria: eu estou construindo aos poucos, um de cada vez. Trabalhe só no arquivo que eu pedir
