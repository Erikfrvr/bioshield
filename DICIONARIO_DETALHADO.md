# Dicionário de Dados: Sistema de Vendas

Documento de referência do projeto `sistemaVenda`. Serve para consultar rapidamente nomes de tabelas, colunas, tipos, entidades, DTOs, rotas e regras de negócio sem precisar abrir vários arquivos ao mesmo tempo.

**Onde salvar:** `projeto/docs/DICIONARIO_DE_DADOS.md`

**Como abrir no VS Code:** com o arquivo aberto, use `Ctrl + Shift + V` para ver a versão formatada. Use `Ctrl + K` e depois `V` para abrir a visualização ao lado do código.

---

## 1. Legenda de status

Cada item do documento tem um status, para vocês saberem o que já está fechado e o que ainda precisa de conferência.

| Status | Significado |
|---|---|
| Confirmado | Existe no código ou no script do banco e já foi validado |
| Verificar | Está previsto pela estrutura do projeto, mas precisa ser conferido em `projeto/database/sistemaVendas.sql` |
| Pendente | Ainda não existe e precisa ser criado |

---

## 2. Visão geral do sistema

Sistema de vendas com cadastro de usuários, categorias e produtos. O backend é feito em TypeScript seguindo DDD e Clean Architecture, com banco MySQL. O frontend consome a API por meio de requisições em JavaScript puro.

**Fluxo de uma requisição:**

```
Rota  ->  Controller  ->  Service  ->  Repository (contrato)  ->  Infrastructure (MySQL)  ->  Banco
```

O caminho de volta é o inverso, com a Entidade sendo convertida em DTO de resposta antes de sair pelo Controller.

---

## 3. Mapa de pastas

```
projeto/
├── backend/
│   ├── controllers/          Recebe a requisição e devolve a resposta HTTP
│   │   └── usuarioController.ts
│   ├── infrastructure/       Implementação real do acesso ao MySQL
│   │   ├── UsuarioInfrasctructure.ts
│   │   ├── categoriaInfrasctructure.ts
│   │   └── produtosInfrastructure.ts
│   ├── models/
│   │   ├── dto/              Formato dos dados que entram e saem da API
│   │   ├── entidade/         Objetos de domínio com as regras do negócio
│   │   └── valueObjects/     Tipos que se validam sozinhos
│   ├── repository/           Contratos (interfaces) de acesso a dados
│   ├── routes/               Definição dos endpoints
│   ├── services/             Regras de negócio e orquestração
│   └── server.ts             Ponto de entrada da aplicação
├── database/
│   └── sistemaVendas.sql     Script de criação do banco
├── estudo/                   Exercícios de apoio, fora do sistema principal
└── frontEnd/
    ├── index.html
    ├── style.css
    ├── js/produtos.js
    └── pages/
        ├── produtos.html
        └── produto.css
```

---

## 4. Banco de dados

**Nome do banco:** `sistemaVendas` (Verificar)
**Motor:** MySQL / InnoDB
**Codificação recomendada:** `utf8mb4` com collation `utf8mb4_general_ci`

### 4.1 Tabela: usuarios

Guarda quem acessa o sistema.

| Coluna | Tipo | Obrigatório | Chave | Padrão | Descrição | Status |
|---|---|---|---|---|---|---|
| id | INT | Sim | PK, incremento automático | | Identificador único do usuário | Verificar |
| nome | VARCHAR(100) | Sim | | | Nome completo do usuário | Verificar |
| email | VARCHAR(150) | Sim | Única | | Endereço de email, usado como login | Verificar |
| senha | VARCHAR(255) | Sim | | | Senha do usuário, armazenada com hash | Verificar |

**Observações**
* O campo `email` precisa de índice único, porque a busca por email é usada no login e no cadastro.
* O tamanho 255 em `senha` é proposital: hash de bcrypt ocupa 60 caracteres e outros algoritmos ocupam mais.

### 4.2 Tabela: categorias

Agrupa os produtos por tipo.

| Coluna | Tipo | Obrigatório | Chave | Padrão | Descrição | Status |
|---|---|---|---|---|---|---|
| id | INT | Sim | PK, incremento automático | | Identificador único da categoria | Verificar |
| nome | VARCHAR(100) | Sim | Única | | Nome da categoria, por exemplo Bebidas | Verificar |
| descricao | VARCHAR(255) | Não | NULL | Texto livre explicando a categoria | Verificar |

### 4.3 Tabela: produtos

Núcleo do sistema. Cada produto pertence a uma categoria.

| Coluna | Tipo | Obrigatório | Chave | Padrão | Descrição | Status |
|---|---|---|---|---|---|---|
| id | INT | Sim | PK, incremento automático | | Identificador único do produto | Verificar |
| nome | VARCHAR(100) | Sim | | | Nome comercial do produto | Verificar |
| descricao | VARCHAR(255) | Não | NULL | Detalhes do produto | Verificar |
| preco | DECIMAL(10,2) | Sim | | | Preço de venda em reais | Verificar |
| quantidade | INT | Sim | 0 | Quantidade disponível em estoque | Verificar |
| data_vencimento | DATE | Não | NULL | Data de validade do produto | Verificar |
| categoria_id | INT | Sim | FK para categorias.id | | Categoria à qual o produto pertence | Verificar |

**Observações**
* Use `DECIMAL(10,2)` e nunca `FLOAT` ou `DOUBLE` para dinheiro. Float arredonda errado e some com centavos.
* `DECIMAL(10,2)` comporta valores até 99.999.999,99.
* A existência do value object `DataVencimento` indica que a coluna de validade faz parte do modelo.

---

## 5. Relacionamentos

| Origem | Destino | Cardinalidade | Regra |
|---|---|---|---|
| produtos.categoria_id | categorias.id | Muitos para um | Um produto pertence a uma categoria; uma categoria tem vários produtos |

**Comportamento sugerido da chave estrangeira**

```sql
FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
```

`RESTRICT` impede apagar uma categoria que ainda tem produtos ligados a ela, o que evita produto órfão no banco.

---

## 6. Value Objects

Value Objects são tipos que validam o próprio conteúdo no momento em que são criados. Se o valor for inválido, o objeto nem chega a existir. Isso impede dado errado de entrar no domínio.

| Arquivo | Representa | Validações esperadas | Status |
|---|---|---|---|
| `Email.ts` | Endereço de email | Formato válido, presença de arroba e domínio, texto não vazio | Confirmado |
| `Senha.ts` | Senha do usuário | Tamanho mínimo, regras de complexidade, geração e comparação de hash | Confirmado |
| `Preco.ts` | Valor monetário | Número válido, não negativo, duas casas decimais | Confirmado |
| `DataVencimento.ts` | Data de validade | Data válida, coerência com a data atual | Confirmado |

**Ponto de atenção:** todo valor que entra pelo DTO deve ser convertido em Value Object antes de virar Entidade. Se o Service passar uma string direto para a Entidade, a validação é perdida.

---

## 7. Entidades de domínio

### 7.1 Usuario (`models/entidade/Usuario.ts`)

| Atributo | Tipo | Origem no banco | Descrição |
|---|---|---|---|
| id | number | usuarios.id | Identificador |
| nome | string | usuarios.nome | Nome completo |
| email | Email | usuarios.email | Value object de email |
| senha | Senha | usuarios.senha | Value object de senha |

### 7.2 Categoria (`models/entidade/Categoria.ts`)

| Atributo | Tipo | Origem no banco | Descrição |
|---|---|---|---|
| id | number | categorias.id | Identificador |
| nome | string | categorias.nome | Nome da categoria |
| descricao | string | categorias.descricao | Descrição opcional |

### 7.3 Produto (`models/entidade/Produto.ts`)

| Atributo | Tipo | Origem no banco | Descrição |
|---|---|---|---|
| id | number | produtos.id | Identificador |
| nome | string | produtos.nome | Nome do produto |
| descricao | string | produtos.descricao | Descrição opcional |
| preco | Preco | produtos.preco | Value object de preço |
| quantidade | number | produtos.quantidade | Estoque disponível |
| dataVencimento | DataVencimento | produtos.data_vencimento | Value object de validade |
| categoriaId | number | produtos.categoria_id | Ligação com a categoria |

**Atenção à tradução de nomes:** o banco usa `snake_case` (`data_vencimento`, `categoria_id`) e o TypeScript usa `camelCase` (`dataVencimento`, `categoriaId`). Essa conversão acontece na camada Infrastructure. Se um campo voltar `undefined` no frontend, o primeiro lugar a olhar é essa conversão.

---

## 8. DTOs

DTO é o formato dos dados em trânsito. Ele existe para que a API não exponha a entidade inteira nem aceite qualquer coisa vinda do cliente.

### 8.1 DTOs de Usuario

| Arquivo | Direção | Campos | Uso |
|---|---|---|---|
| `UsuarioCadastrarDTO.ts` | Entrada | nome, email, senha | Corpo do cadastro de usuário |
| `UsuarioBuscarPorEmailDTO.ts` | Entrada | email | Busca ou verificação de usuário existente |
| `UsuarioListarDTO.ts` | Saída | id, nome, email | Listagem de usuários, **sem a senha** |

**Regra importante:** a senha nunca aparece em DTO de saída, nem com hash.

### 8.2 DTOs de Produto

| Arquivo | Direção | Campos | Uso |
|---|---|---|---|
| `CriarProdutoDTO.ts` | Entrada | nome, descricao, preco, quantidade, dataVencimento, categoriaId | Criação de produto |
| `AtualizarProdutoDTO.ts` | Entrada | id e os campos editáveis | Atualização de produto existente |
| `ProdutoResponseDTO.ts` | Saída | id, nome, descricao, preco, quantidade, dataVencimento, categoria | Retorno da API para o frontend |

### 8.3 DTOs de Categoria

| Arquivo | Direção | Campos | Uso |
|---|---|---|---|
| `categoria/CadastrarCategoriaDTO.ts` | Entrada | nome, descricao | Criação de categoria |
| `categoria/ListarCategoriaDTO.ts` | Saída | id, nome, descricao | Listagem de categorias |

---

## 9. Contratos de repositório

As interfaces em `repository/` dizem **o que** pode ser feito. As classes em `infrastructure/` dizem **como** é feito no MySQL. Trocar de banco no futuro significa escrever uma nova Infrastructure sem mexer em Service nem em Controller.

| Contrato | Implementação | Métodos esperados |
|---|---|---|
| `UsuarioRepository.ts` | `UsuarioInfrasctructure.ts` | cadastrar, listar, buscarPorEmail |
| `CategoriaRepository.ts` | `categoriaInfrasctructure.ts` | cadastrar, listar, buscarPorId |
| `ProdutoRepository.ts` | `produtosInfrastructure.ts` | criar, listar, buscarPorId, atualizar, deletar |

---

## 10. Services e regras de negócio

| Service | Responsabilidades |
|---|---|
| `UsuarioService.ts` | Impedir email repetido no cadastro, transformar senha em hash, montar `UsuarioListarDTO` sem expor senha |
| `CategoriaService.ts` | Impedir nome de categoria repetido, validar que o nome não está vazio |
| `ProdutoService.ts` | Validar preço e quantidade, confirmar que a categoria informada existe, converter Entidade em `ProdutoResponseDTO` |

---

## 11. Rotas da API

Base sugerida: `http://localhost:3000`

### Usuários (`routes/UsuarioRoutes.ts`)

| Método | Caminho | Corpo | Retorno | Status |
|---|---|---|---|---|
| POST | /usuarios | UsuarioCadastrarDTO | Usuário criado | Verificar |
| GET | /usuarios | | Lista de UsuarioListarDTO | Verificar |
| GET | /usuarios/email/:email | | UsuarioListarDTO | Verificar |

### Categorias (`routes/categoriaRoutes.ts`)

| Método | Caminho | Corpo | Retorno | Status |
|---|---|---|---|---|
| POST | /categorias | CadastrarCategoriaDTO | Categoria criada | Verificar |
| GET | /categorias | | Lista de ListarCategoriaDTO | Verificar |

### Produtos (`routes/produtoRoutes.ts`)

| Método | Caminho | Corpo | Retorno | Status |
|---|---|---|---|---|
| POST | /produtos | CriarProdutoDTO | ProdutoResponseDTO | Verificar |
| GET | /produtos | | Lista de ProdutoResponseDTO | Verificar |
| GET | /produtos/:id | | ProdutoResponseDTO | Verificar |
| PUT | /produtos/:id | AtualizarProdutoDTO | ProdutoResponseDTO | Verificar |
| DELETE | /produtos/:id | | Confirmação | Verificar |

---

## 12. Códigos de resposta HTTP

| Código | Quando usar |
|---|---|
| 200 | Requisição concluída com sucesso |
| 201 | Registro criado |
| 400 | Dados inválidos enviados pelo cliente |
| 404 | Registro não encontrado |
| 409 | Conflito, por exemplo email ou categoria já cadastrados |
| 500 | Erro interno do servidor |

---

## 13. Glossário

| Termo | Significado |
|---|---|
| DTO | Data Transfer Object, objeto que carrega dados entre camadas |
| Entidade | Objeto de domínio com identidade própria e regras de negócio |
| Value Object | Objeto sem identidade que vale pelo seu valor e valida a si mesmo |
| Repository | Contrato que define as operações de acesso a dados |
| Infrastructure | Implementação concreta do repositório, aqui usando MySQL |
| Service | Camada que concentra as regras de negócio |
| Controller | Camada que recebe a requisição HTTP e devolve a resposta |
| PK | Chave primária, identifica cada linha de forma única |
| FK | Chave estrangeira, liga uma tabela a outra |

---

## 14. Convenções do projeto

| Item | Convenção |
|---|---|
| Tabelas do banco | Plural e minúsculo: `usuarios`, `produtos`, `categorias` |
| Colunas do banco | `snake_case`: `data_vencimento`, `categoria_id` |
| Classes TypeScript | `PascalCase`: `Produto`, `ProdutoService` |
| Variáveis e métodos | `camelCase`: `buscarPorEmail`, `dataVencimento` |
| Arquivos de classe | Mesmo nome da classe que exportam |

---

## 15. Pendências e pontos de atenção

Lista do que precisa de ajuste ou confirmação. Marquem conforme forem resolvendo.

| Item | Descrição | Responsável |
|---|---|---|
| Confirmar o script SQL | Abrir `projeto/database/sistemaVendas.sql` e ajustar as seções 4 e 5 com os tipos reais | |
| Erro de grafia nos arquivos | `UsuarioInfrasctructure.ts` e `categoriaInfrasctructure.ts` estão escritos como Infrasctructure | |
| Padronizar nomes de arquivos | Há mistura de maiúscula e minúscula na primeira letra e de singular com plural nas camadas infrastructure e routes | |
| Controllers faltando | Existe apenas `usuarioController.ts`; faltam os de categoria e produto | |
| Pasta EstudoArquiteturaTI102 | No último commit subiram apenas `.gitattributes`, `LICENSE` e `README.md`; conferir se o código ficou de fora | |
| Publicar no GitHub | O repositório `DaiHoss/sistemaVenda` ainda não existe no GitHub, por isso o push falha | Daiane |

---

*Última atualização: 15 de setembro de 2026*
