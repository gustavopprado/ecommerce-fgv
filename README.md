# E-commerce FGV - Documentação Técnica Completa

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Arquitetura do Sistema](#arquitetura-do-sistema)
5. [Modelo de Dados](#modelo-de-dados)
6. [Fluxos Principais](#fluxos-principais)
7. [Instalação e Configuração](#instalação-e-configuração)
8. [Execução do Projeto](#execução-do-projeto)
9. [Endpoints da API](#endpoints-da-api)
10. [Segurança e Boas Práticas](#segurança-e-boas-práticas)
11. [Produção](#produção)

---

## 🎯 Visão Geral do Sistema

O **E-commerce FGV** é um sistema de e-commerce interno desenvolvido para colaboradores da FGV (Fundação Getulio Vargas). O sistema permite que colaboradores realizem pedidos de produtos através de uma interface web, enquanto administradores gerenciam pedidos, visualizam relatórios e exportam dados através de um painel administrativo.

### Componentes do Sistema

O projeto é composto por **três aplicações principais**:

1. **Backend** (`backend/`): API REST desenvolvida em Node.js/Express
   - Autenticação de administradores
   - Gerenciamento de pedidos e produtos
   - Integração com banco de dados MySQL
   - Geração de planilhas Excel (XLSX)
   - Envio de emails automáticos

2. **Frontend Admin** (`frontend-admin/`): Painel administrativo em React/Vite
   - Login de administradores
   - Dashboard com estatísticas e métricas
   - Gestão completa de pedidos (listar, filtrar, editar, exportar)

3. **Frontend Colaborador** (`frontend-colaborador/`): Interface para colaboradores em React/Vite
   - Consulta de catálogo de produtos
   - Montagem de carrinho de compras
   - Registro de pedidos com opções de parcelamento
   - Visualização de confirmação de pedidos

### Arquitetura de Comunicação

```
┌─────────────────────┐         HTTP/REST          ┌─────────────────────┐
│  Frontend Admin     │ ──────────────────────────> │                    │
│  (React + Vite)     │                             │                    │
└─────────────────────┘                             │     Backend API    │
                                                    │  (Node.js/Express) │
┌─────────────────────┐                             │                    │
│ Frontend Colaborador│ ──────────────────────────> │                    │
│  (React + Vite)     │                             └─────────────────────┘
└─────────────────────┘                                        │
                                                               │
                                                               ▼
                                                      ┌─────────────────────┐
                                                      │   MySQL Database    │
                                                      └─────────────────────┘
```

---

## 📁 Estrutura de Diretórios

### Raiz do Projeto

```
ecommerce-fgv/
├── backend/                    # API Node.js/Express
├── frontend-admin/             # Painel administrativo React
├── frontend-colaborador/       # Interface do colaborador React
├── ecosystem.config.js         # Configuração PM2 para produção
└── README.md                   # Este arquivo
```

### Backend (`backend/`)

```
backend/
├── src/
│   ├── server.js                      # Ponto de entrada da aplicação
│   ├── config/
│   │   └── db.js                      # Configuração do MySQL (pool de conexões)
│   ├── controllers/
│   │   ├── admin.controller.js        # Lógica de autenticação e dashboard admin
│   │   ├── orders.controller.js       # Lógica de pedidos (CRUD, XLSX, emails)
│   │   └── products.controller.js     # Lógica de produtos (listagem)
│   ├── routes/
│   │   ├── admin.routes.js            # Rotas /api/admin/*
│   │   ├── orders.routes.js          # Rotas /api/pedidos/*
│   │   └── products.routes.js         # Rotas /api/produtos
│   ├── middlewares/
│   │   └── authAdmin.js               # Middleware JWT para autenticação admin
│   ├── utils/
│   │   └── email.js                   # Utilitário para envio de emails (Nodemailer)
│   ├── scripts/
│   │   ├── importJson.js              # Script para importar produtos.json
│   │   └── importFuncionariosJson.js  # Script para importar funcionários
│   ├── data/
│   │   ├── produtos.json              # Catálogo de produtos (JSON)
│   │   └── infos_funcionarios_trim.json # Dados de funcionários
│   └── templates/
│       └── ficha_base.xlsx            # Template Excel para fichas de pedido
├── .env                              # Variáveis de ambiente (não versionado)
└── package.json                       # Dependências e scripts
```

**Principais Arquivos:**

- **`src/server.js`**: Configura o Express, middlewares globais (CORS, JSON), registra rotas e inicia o servidor na porta 3001 (ou definida em `.env`).
- **`src/config/db.js`**: Configuração do pool de conexões MySQL usando `mysql2`.
- **`src/controllers/admin.controller.js`**: Gerencia login, dashboard e relatórios administrativos.
- **`src/controllers/orders.controller.js`**: Gerencia criação, listagem, edição e exportação de pedidos.
- **`src/middlewares/authAdmin.js`**: Valida tokens JWT nas rotas protegidas.

### Frontend Admin (`frontend-admin/`)

```
frontend-admin/
├── src/
│   ├── main.jsx                  # Ponto de entrada React
│   ├── App.jsx                   # Roteamento e gerenciamento de autenticação
│   ├── pages/
│   │   ├── AdminLoginPage.jsx    # Tela de login
│   │   ├── DashboardPage.jsx     # Dashboard com estatísticas
│   │   └── OrdersPage.jsx        # Listagem e gestão de pedidos
│   ├── components/
│   │   └── AdminHeader.jsx       # Cabeçalho com navegação
│   └── services/
│       └── api.js                # Cliente HTTP (Axios) para API
├── public/
│   └── logo.png
└── package.json
```

### Frontend Colaborador (`frontend-colaborador/`)

```
frontend-colaborador/
├── src/
│   ├── main.jsx                  # Ponto de entrada React
│   ├── App.jsx                   # Roteamento simples
│   ├── pages/
│   │   └── EmployeeOrderPage.jsx # Página principal de pedidos
│   ├── components/
│   │   ├── Header.jsx            # Cabeçalho
│   │   ├── ProductList.jsx       # Lista de produtos
│   │   └── Cart.jsx              # Carrinho de compras
│   ├── services/
│   │   └── api.js                # Cliente HTTP (Axios)
│   └── assets/
│       └── success-animation.json # Animação Lottie
├── public/
│   ├── logo_fgv_ecomerce_novembro_2025.png
│   └── Guia_de_Produtos_2025.pdf
└── package.json
```

---

## 🛠 Tecnologias Utilizadas

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | - | Runtime JavaScript |
| **Express** | ^4.22.1 | Framework web |
| **MySQL2** | ^3.15.3 | Driver MySQL (pool de conexões) |
| **jsonwebtoken** | ^9.0.2 | Autenticação JWT |
| **Nodemailer** | ^7.0.11 | Envio de emails |
| **ExcelJS** | ^4.4.0 | Geração de planilhas Excel |
| **CORS** | ^2.8.5 | Cross-Origin Resource Sharing |
| **dotenv** | ^17.2.3 | Gerenciamento de variáveis de ambiente |
| **Nodemon** | ^3.1.0 | Hot-reload em desenvolvimento |

### Frontend Admin

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | ^19.2.0 | Biblioteca UI |
| **React DOM** | ^19.2.0 | Renderização React |
| **React Router DOM** | ^7.9.6 | Roteamento |
| **Axios** | ^1.13.2 | Cliente HTTP |
| **Vite** | ^7.2.4 | Build tool e dev server |
| **ESLint** | ^9.39.1 | Linter |

### Frontend Colaborador

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | ^19.2.0 | Biblioteca UI |
| **React DOM** | ^19.2.0 | Renderização React |
| **React Router DOM** | ^7.9.6 | Roteamento |
| **Axios** | ^1.13.2 | Cliente HTTP |
| **jsPDF** | ^3.0.4 | Geração de PDFs |
| **html2canvas** | ^1.4.1 | Captura de tela para PDF |
| **react-lottie** | ^1.2.10 | Animações Lottie |
| **Vite** | ^7.2.4 | Build tool e dev server |

### Produção

- **PM2**: Gerenciamento de processos Node.js (configurado em `ecosystem.config.js`)

---

## 🏗 Arquitetura do Sistema

### Fluxo de Requisição HTTP

#### Exemplo: Criar Pedido (Colaborador)

1. **Frontend** (`EmployeeOrderPage.jsx`)
   - Usuário preenche dados e adiciona produtos ao carrinho
   - Submete formulário

2. **Service** (`api.js`)
   - `criarPedido()` faz `POST /api/pedidos` via Axios

3. **Backend - Roteamento** (`orders.routes.js`)
   - Rota: `POST /api/pedidos` → `criarPedido()`

4. **Controller** (`orders.controller.js`)
   - Valida dados (nome, setor, crachá, itens)
   - Calcula total e valida parcelamento
   - Inicia transação MySQL

5. **Banco de Dados**
   - Upsert em `funcionarios` (por crachá)
   - INSERT em `pedidos`
   - INSERT em `itens_pedido` (bulk)
   - Commit da transação

6. **Email** (background)
   - Gera ficha XLSX
   - Envia email via Nodemailer

7. **Resposta**
   - Retorna JSON: `{ message, pedidoId, valorTotal }`

#### Exemplo: Listar Pedidos (Admin)

1. **Frontend** (`OrdersPage.jsx`)
   - Faz `GET /api/pedidos` com token Bearer

2. **Middleware** (`authAdmin.js`)
   - Valida JWT
   - Adiciona `req.admin` ao request

3. **Controller** (`orders.controller.js`)
   - Constrói WHERE com filtros (ano/mês ou período)
   - Query com JOIN `pedidos` + `funcionarios`
   - Retorna lista de pedidos

---

## 🗄 Modelo de Dados

### Tabelas Principais

#### `funcionarios`

Armazena dados dos colaboradores da FGV.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único |
| `nome` | VARCHAR | Nome completo do funcionário |
| `setor` | VARCHAR | Setor de trabalho |
| `cracha` | INT (UNIQUE) | Número do crachá (identificador único) |

#### `pedidos`

Armazena os pedidos realizados pelos colaboradores.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único do pedido |
| `funcionario_id` | INT (FK) | Referência a `funcionarios.id` |
| `data_pedido` | DATETIME | Data e hora da criação do pedido |
| `valor_total` | DECIMAL(10,2) | Valor total do pedido |
| `valor_total_original` | DECIMAL(10,2) | Valor original (para histórico em edições) |
| `status` | ENUM | Status: `Pendente`, `Concluido`, `Cancelado` |
| `aceita_desconto` | BOOLEAN | Se aceita desconto em folha |
| `numero_parcelas` | INT | Número de parcelas (1-10) |
| `editado` | BOOLEAN | Se o pedido foi editado |
| `editado_em` | DATETIME | Data da última edição |
| `observacoes_edicao` | TEXT | Observações sobre a edição |

#### `itens_pedido`

Armazena os itens de cada pedido.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único |
| `pedido_id` | INT (FK) | Referência a `pedidos.id` |
| `codigo_produto` | VARCHAR | Código do produto |
| `descricao_produto` | VARCHAR | Descrição do produto |
| `quantidade` | INT | Quantidade solicitada |
| `preco_unitario` | DECIMAL(10,2) | Preço unitário do produto |

#### `produtos_json`

Armazena o catálogo completo de produtos em formato JSON.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK) | Identificador único |
| `json_data` | JSON/TEXT | Catálogo completo de produtos |

#### `funcionarios_json`

Armazena dados adicionais de funcionários importados de sistemas externos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cracha` | INT (PK) | Número do crachá |
| `nome_completo` | VARCHAR | Nome completo |
| `centro_custo` | VARCHAR | Centro de custo |
| `descricao_centro_custo` | VARCHAR | Descrição do centro de custo |

### Relacionamentos

```
funcionarios (1) ────< (N) pedidos
pedidos (1) ────< (N) itens_pedido
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Login (Admin)

```
1. Admin acessa frontend-admin (ex: http://localhost:5173)
2. Preenche credenciais na AdminLoginPage
3. Frontend chama POST /api/admin/login
4. Backend valida credenciais (admin / Setav@*2025Painel)
5. Gera JWT com expiração de 8h
6. Retorna token ao frontend
7. Frontend salva token no localStorage
8. Redireciona para Dashboard
9. Próximas requisições incluem Authorization: Bearer <token>
10. Middleware authAdmin valida token antes de acessar controllers
```

### 2. Fluxo de Compra (Colaborador)

```
1. Colaborador acessa frontend-colaborador
2. Informa crachá → GET /api/pedidos/employee/:cracha
3. Carrega produtos → GET /api/produtos
4. Adiciona produtos ao carrinho
5. Preenche dados (parcelas, desconto em folha)
6. Submete pedido → POST /api/pedidos
7. Backend valida dados
8. Calcula total e valida regras de parcelamento
9. Inicia transação MySQL
10. Upsert funcionário (garante existência)
11. Insere pedido
12. Insere itens do pedido
13. Commit transação
14. Gera ficha XLSX
15. Envia email de notificação
16. Retorna sucesso ao frontend
17. Frontend exibe tela de confirmação com animação
```

### 3. Fluxo de Gestão de Pedidos (Admin)

```
1. Admin logado acessa OrdersPage
2. Frontend chama GET /api/pedidos (com token)
3. Middleware valida JWT
4. Controller aplica filtros (ano, mês, status)
5. Query com JOIN pedidos + funcionarios
6. Retorna lista de pedidos
7. Admin pode:
   - Visualizar detalhes (GET /api/pedidos/:id)
   - Editar pedido (PUT /api/pedidos/:id)
   - Atualizar status (PATCH /api/pedidos/:id/status)
   - Baixar ficha Excel (GET /api/pedidos/:id/xlsx)
   - Gerar relatório geral (GET /api/admin/relatorios/pedidos-xlsx)
   - Enviar relatório por email (POST /api/admin/relatorios/pedidos-email)
```

### 4. Fluxo de Dashboard Administrativo

```
1. Frontend chama GET /api/admin/dashboard?ano=YYYY&mes=MM
2. Middleware valida JWT
3. Controller aplica filtros de período
4. Calcula métricas:
   - Total de pedidos
   - Valor total
   - Colaboradores únicos
   - Pedidos por status
   - Distribuição mensal
   - Top 10 produtos mais pedidos
5. Retorna dados agregados
6. Frontend exibe gráficos e cards no DashboardPage
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **MySQL** (versão 5.7 ou superior, ou MariaDB 10.3+)
- **npm** ou **yarn** (gerenciador de pacotes)

### Passo 1: Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd ecommerce-fgv
```

### Passo 2: Configurar Banco de Dados

1. Criar o banco de dados:

```sql
CREATE DATABASE ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Criar as tabelas (execute os scripts SQL necessários ou use migrations se disponíveis).

### Passo 3: Configurar Backend

1. Navegar para o diretório do backend:

```bash
cd backend
```

2. Instalar dependências:

```bash
npm install
```

3. Criar arquivo `.env` na raiz do `backend/`:

```env
# Servidor
PORT=3001

# Banco de Dados MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=ecommerce

# JWT
JWT_SECRET=seu_segredo_jwt_aqui_use_uma_string_aleatoria_forte

# Email (SMTP)
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app_do_gmail
REPORT_EMAIL=destinatario@fgv.br
```

**Nota sobre Gmail**: Para usar Gmail como SMTP, você precisará:
- Ativar autenticação de 2 fatores
- Gerar uma "Senha de app" específica para este uso
- Usar essa senha de app no campo `SMTP_PASS`

4. Importar dados iniciais:

```bash
# Importar catálogo de produtos
node src/scripts/importJson.js

# Importar dados de funcionários
node src/scripts/importFuncionariosJson.js
```

### Passo 4: Configurar Frontend Admin

1. Navegar para o diretório:

```bash
cd ../frontend-admin
```

2. Instalar dependências:

```bash
npm install
```

3. (Opcional) Configurar variáveis de ambiente se necessário (ex: `VITE_API_URL`).

### Passo 5: Configurar Frontend Colaborador

1. Navegar para o diretório:

```bash
cd ../frontend-colaborador
```

2. Instalar dependências:

```bash
npm install
```

3. (Opcional) Configurar variáveis de ambiente se necessário.

---

## 🚀 Execução do Projeto

### Modo Desenvolvimento

#### Backend

```bash
cd backend
npm run dev
```

O backend estará disponível em `http://localhost:3001` (ou porta definida em `.env`).

#### Frontend Admin

```bash
cd frontend-admin
npm run dev
```

Acesse `http://localhost:5173` (ou porta indicada pelo Vite).

#### Frontend Colaborador

```bash
cd frontend-colaborador
npm run dev
```

Acesse `http://localhost:5173` (ou outra porta se o admin estiver rodando).

**Nota**: O Vite pode automaticamente usar outra porta se 5173 estiver ocupada.

### Modo Produção

#### Build dos Frontends

```bash
# Frontend Admin
cd frontend-admin
npm run build

# Frontend Colaborador
cd frontend-colaborador
npm run build
```

#### Executar com PM2

1. Instalar PM2 globalmente:

```bash
npm install -g pm2
```

2. Na raiz do projeto, iniciar todas as aplicações:

```bash
pm2 start ecosystem.config.js
```

3. Verificar status:

```bash
pm2 status
```

4. Parar aplicações:

```bash
pm2 stop ecosystem.config.js
```

5. Ver logs:

```bash
pm2 logs
```

---

## 📡 Endpoints da API

### Autenticação Admin

#### `POST /api/admin/login`

Autentica um administrador e retorna um token JWT.

**Body:**
```json
{
  "username": "admin",
  "password": "Setav@*2025Painel"
}
```

**Resposta (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Resposta (401):**
```json
{
  "error": "Usuário ou senha inválidos."
}
```

---

### Dashboard Admin

#### `GET /api/admin/dashboard`

Retorna estatísticas do dashboard administrativo.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `ano` (opcional): Ano para filtrar (ex: `2025`)
- `mes` (opcional): Mês para filtrar (1-12)

**Resposta (200):**
```json
{
  "totais": {
    "total_pedidos": 150,
    "total_valor": 45000.50,
    "total_colaboradores": 45
  },
  "pedidos_por_status": [
    { "status": "Pendente", "total": 30 },
    { "status": "Concluido", "total": 120 }
  ],
  "pedidos_por_mes": [
    { "mes": "2025-01", "total": 50 },
    { "mes": "2025-02", "total": 100 }
  ],
  "top_produtos": [
    { "codigo": "PROD001", "descricao": "Produto A", "total_pedidos": 25 }
  ]
}
```

---

### Produtos

#### `GET /api/produtos`

Retorna o catálogo completo de produtos.

**Resposta (200):**
```json
{
  "produtos": [
    {
      "codigo": "PROD001",
      "descricao": "Produto Exemplo",
      "preco": 99.90,
      "categoria": "Categoria A"
    }
  ]
}
```

---

### Pedidos

#### `POST /api/pedidos`

Cria um novo pedido (endpoint público).

**Body:**
```json
{
  "nome": "João Silva",
  "setor": "TI",
  "cracha": 12345,
  "itens": [
    {
      "codigo_produto": "PROD001",
      "descricao_produto": "Produto A",
      "quantidade": 2,
      "preco_unitario": 99.90
    }
  ],
  "numero_parcelas": 3,
  "aceita_desconto": true
}
```

**Resposta (201):**
```json
{
  "message": "Pedido criado com sucesso",
  "pedidoId": 123,
  "valorTotal": 199.80
}
```

#### `GET /api/pedidos`

Lista pedidos (requer autenticação admin).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `ano` (opcional): Filtrar por ano
- `mes` (opcional): Filtrar por mês
- `status` (opcional): Filtrar por status

**Resposta (200):**
```json
{
  "pedidos": [
    {
      "id": 123,
      "data_pedido": "2025-02-05T10:30:00Z",
      "valor_total": 199.80,
      "status": "Pendente",
      "funcionario": {
        "nome": "João Silva",
        "setor": "TI",
        "cracha": 12345
      }
    }
  ]
}
```

#### `GET /api/pedidos/:id`

Retorna detalhes de um pedido específico.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "pedido": {
    "id": 123,
    "data_pedido": "2025-02-05T10:30:00Z",
    "valor_total": 199.80,
    "status": "Pendente",
    "numero_parcelas": 3,
    "aceita_desconto": true,
    "funcionario": {
      "nome": "João Silva",
      "setor": "TI",
      "cracha": 12345
    },
    "itens": [
      {
        "codigo_produto": "PROD001",
        "descricao_produto": "Produto A",
        "quantidade": 2,
        "preco_unitario": 99.90
      }
    ]
  }
}
```

#### `PUT /api/pedidos/:id`

Edita um pedido existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "itens": [
    {
      "codigo_produto": "PROD002",
      "descricao_produto": "Produto B",
      "quantidade": 1,
      "preco_unitario": 149.90
    }
  ],
  "observacoes_edicao": "Pedido atualizado conforme solicitação"
}
```

**Resposta (200):**
```json
{
  "message": "Pedido atualizado com sucesso",
  "pedidoId": 123
}
```

#### `PATCH /api/pedidos/:id/status`

Atualiza o status de um pedido.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "Concluido"
}
```

**Resposta (200):**
```json
{
  "message": "Status atualizado com sucesso"
}
```

#### `GET /api/pedidos/employee/:cracha`

Busca dados de um funcionário pelo número do crachá (endpoint público).

**Resposta (200):**
```json
{
  "funcionario": {
    "nome": "João Silva",
    "setor": "TI",
    "cracha": 12345
  }
}
```

#### `GET /api/pedidos/:id/xlsx`

Gera e retorna a ficha Excel de um pedido.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Arquivo XLSX para download

---

### Relatórios Admin

#### `GET /api/admin/relatorios/pedidos-xlsx`

Gera relatório geral de pedidos em formato XLSX.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta (200):**
- Arquivo XLSX com duas planilhas: "Pedidos" e "Itens"

#### `POST /api/admin/relatorios/pedidos-email`

Envia relatório de pedidos por email.

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "message": "Relatório enviado por e-mail com sucesso."
}
```

---

## 🔒 Segurança e Boas Práticas

### Autenticação

- **JWT**: Tokens expiram em 8 horas
- **Credenciais Admin**: Atualmente hardcoded no código (`admin` / `Setav@*2025Painel`)
  - **⚠️ Recomendação**: Migrar para tabela de usuários no banco de dados em produção

### Validação de Dados

- Validação de campos obrigatórios nos controllers
- Sanitização de inputs para prevenir SQL Injection (uso de placeholders `?` nas queries)
- Validação de tipos e formatos (parcelas, valores monetários)

### CORS

- Configurado para permitir todas as origens em desenvolvimento
- **⚠️ Recomendação**: Restringir origens permitidas em produção

### Variáveis de Ambiente

- Credenciais sensíveis (JWT_SECRET, senhas de banco, SMTP) devem estar no `.env`
- Arquivo `.env` não deve ser versionado (adicionar ao `.gitignore`)

### Banco de Dados

- Uso de transações para operações críticas (criação de pedidos)
- Pool de conexões para otimizar performance
- Queries parametrizadas para prevenir SQL Injection

### Emails

- Configuração SMTP segura (Gmail com senha de app)
- Tratamento de erros no envio de emails

---

## 🌐 Produção

### Checklist de Deploy

- [ ] Configurar variáveis de ambiente no servidor
- [ ] Ajustar CORS para domínios específicos
- [ ] Configurar HTTPS (SSL/TLS)
- [ ] Migrar credenciais admin para banco de dados
- [ ] Configurar backup automático do banco de dados
- [ ] Configurar monitoramento e logs
- [ ] Testar envio de emails em produção
- [ ] Configurar domínios/subdomínios para frontends
- [ ] Otimizar builds de produção (minificação, tree-shaking)
- [ ] Configurar rate limiting na API (opcional)

### PM2 Ecosystem

O arquivo `ecosystem.config.js` configura o PM2 para gerenciar todas as aplicações:

```javascript
module.exports = {
  apps: [
    {
      name: "ecommerce-backend",
      cwd: "./backend",
      script: "src/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ecommerce-colaborador",
      cwd: "./frontend-colaborador",
      script: "server-colaborador.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ecommerce-admin",
      cwd: "./frontend-admin",
      script: "server-admin.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

### Comandos PM2 Úteis

```bash
# Iniciar todas as aplicações
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs

# Parar todas
pm2 stop ecosystem.config.js

# Reiniciar todas
pm2 restart ecosystem.config.js

# Deletar todas
pm2 delete ecosystem.config.js

# Monitoramento em tempo real
pm2 monit
```

---

## 📝 Scripts Úteis

### Importação de Dados

```bash
# Importar produtos
cd backend
node src/scripts/importJson.js

# Importar funcionários
node src/scripts/importFuncionariosJson.js
```

---

## 🐛 Troubleshooting

### Backend não inicia

- Verificar se MySQL está rodando
- Verificar credenciais no `.env`
- Verificar se a porta 3001 está disponível

### Erro de conexão com banco

- Verificar se o banco `ecommerce` existe
- Verificar usuário e senha do MySQL
- Verificar se o MySQL aceita conexões de `localhost`

### Frontend não conecta ao backend

- Verificar se o backend está rodando
- Verificar URL da API no código do frontend
- Verificar CORS no backend

### Erro de autenticação

- Verificar se o token JWT está sendo enviado no header `Authorization`
- Verificar se o token não expirou (8 horas)
- Verificar `JWT_SECRET` no `.env`

### Emails não são enviados

- Verificar configurações SMTP no `.env`
- Para Gmail: usar senha de app, não senha normal
- Verificar logs do backend para erros específicos

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Logs do backend: `pm2 logs ecommerce-backend`
- Logs do frontend: console do navegador (F12)
- Documentação das tecnologias utilizadas

---

## 📄 Licença

[Especificar licença do projeto]

---

**Última atualização**: Fevereiro 2025
