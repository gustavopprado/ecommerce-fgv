# Análise Técnica Completa — E-commerce Interno FGV

## 1. Visão Geral do Projeto

Este é um sistema web de **e-commerce interno** para a empresa FGV (FGV Terronorte), onde **colaboradores** fazem pedidos de produtos (materiais internos) e um **painel administrativo** gerencia tudo. O valor dos pedidos é descontado diretamente da folha salarial do funcionário.

### Arquitetura Geral

O projeto segue uma arquitetura **monorepo com 3 módulos independentes**:

| Módulo | Tecnologia | Porta | Função |
|--------|-----------|-------|--------|
| `backend` | Node.js + Express | 3001 | API REST |
| `frontend-colaborador` | React 19 + Vite 7 | 4173 | Loja para funcionários |
| `frontend-admin` | React 19 + Vite 7 | 4174 | Painel administrativo |

O deploy em produção é orquestrado via **PM2** (`ecosystem.config.js`) com 3 processos Node separados.

---

## 2. Backend — API REST

### 2.1 Stack Tecnológica

- **Runtime:** Node.js com Express 4.22
- **Banco de Dados:** MySQL (via `mysql2/promise` com connection pool)
- **Autenticação:** JWT (`jsonwebtoken`)
- **E-mail:** Nodemailer (SMTP/Gmail)
- **Relatórios:** ExcelJS (geração de planilhas XLSX)
- **Configuração:** dotenv

### 2.2 Estrutura de Diretórios

```
backend/src/
├── server.js              # Entry point + configuração Express
├── config/
│   └── db.js              # Pool de conexão MySQL
├── controllers/
│   ├── admin.controller.js    # Login, dashboard, relatórios
│   ├── orders.controller.js   # CRUD de pedidos completo
│   └── products.controller.js # Listagem de catálogo
├── routes/
│   ├── admin.routes.js
│   ├── orders.routes.js
│   └── products.routes.js
├── middlewares/
│   └── authAdmin.js       # Middleware JWT para rotas protegidas
├── utils/
│   └── email.js           # Transporter SMTP reutilizável
├── scripts/
│   ├── importJson.js              # Importa catálogo de produtos
│   └── importFuncionariosJson.js  # Importa base de funcionários
├── templates/
│   └── ficha_base.xlsx    # Template Excel para ficha de pedido
└── data/
    ├── produtos.json                 # ~10.736 linhas, catálogo completo
    └── infos_funcionarios_trim.json  # ~1.009 linhas, base de funcionários
```

### 2.3 Mapa Completo de Rotas (API)

| Método | Rota | Auth | Função |
|--------|------|------|--------|
| `GET` | `/` | Não | Health check |
| `GET` | `/api/produtos` | Não | Lista catálogo de produtos |
| `POST` | `/api/pedidos` | Não | Cria novo pedido (colaborador) |
| `GET` | `/api/pedidos/employee/:cracha` | Não | Busca funcionário por crachá |
| `GET` | `/api/pedidos` | Admin | Lista pedidos com filtros |
| `GET` | `/api/pedidos/:id` | Admin | Detalhes de um pedido |
| `GET` | `/api/pedidos/:id/xlsx` | Admin | Gera ficha XLSX do pedido |
| `PATCH` | `/api/pedidos/:id/status` | Admin | Atualiza status do pedido |
| `PUT` | `/api/pedidos/:id` | Admin | Edita itens do pedido |
| `POST` | `/api/admin/login` | Não | Login do admin (retorna JWT) |
| `GET` | `/api/admin/dashboard` | Admin | Dados agregados do dashboard |
| `GET` | `/api/admin/relatorios/pedidos-xlsx` | Admin | Relatório geral XLSX |
| `POST` | `/api/admin/relatorios/pedidos-email` | Admin | Envia relatório por e-mail |

### 2.4 Modelo de Dados (MySQL)

Baseado nas queries SQL, o banco possui pelo menos 4 tabelas:

**`funcionarios`** — Funcionários que fizeram pedidos
- `id` (PK, auto increment)
- `nome`, `setor`, `cracha`

**`funcionarios_json`** — Base completa de funcionários (importada do JSON)
- `cracha`, `nome_completo`, `centro_custo`, `descricao_centro_custo`

**`pedidos`** — Pedidos realizados
- `id` (PK), `funcionario_id` (FK), `data_pedido`, `valor_total`
- `status` (Pendente/Concluido/Cancelado), `aceita_desconto`, `numero_parcelas`
- `editado` (boolean), `editado_em` (datetime), `observacoes_edicao`
- `valor_total_original` (salvo na primeira edição)

**`itens_pedido`** — Itens de cada pedido
- `pedido_id` (FK), `codigo_produto`, `descricao_produto`
- `quantidade`, `preco_unitario`

**`produtos_json`** — Catálogo armazenado como JSON
- `id` (PK), `json_data` (TEXT/JSON com array completo de produtos)

### 2.5 Regras de Negócio Implementadas

1. **Parcelamento:** Pedidos abaixo de R$ 100 só permitem 1x. Máximo de 10 parcelas.
2. **Upsert de funcionário:** Ao criar pedido, se o crachá já existe, atualiza nome/setor; caso contrário, insere novo registro.
3. **Transações:** Criação e edição de pedidos usam `BEGIN/COMMIT/ROLLBACK` com `getConnection()`.
4. **Edição de pedidos:** Salva `valor_total_original` na primeira edição (nunca sobrescreve), marca como editado, substitui todos os itens (DELETE + INSERT).
5. **E-mails automáticos:** Dispara e-mail em background (fire-and-forget com `.catch()`) ao criar ou editar pedido, incluindo ficha XLSX em anexo.
6. **Geração de ficha XLSX:** Usa um template Excel (`ficha_base.xlsx`) e preenche células específicas com dados do pedido.

### 2.6 Autenticação e Segurança

O sistema usa JWT com um middleware (`authAdmin.js`) que extrai o token do header `Authorization: Bearer <token>`.

**Pontos de atenção de segurança:**

- **Credenciais hardcoded:** O login admin usa usuário/senha fixos no código (`admin` / `Setav@*2025Painel`). Isso é marcado como "versão de teste".
- **JWT Secret fraco:** O fallback é `"segredo_super_simples"` ou `"segredo_teste"`.
- **Banco com senha `root/root`:** O `db.js` tem credenciais hardcoded sem usar variáveis de ambiente.
- **CORS aberto:** `app.use(cors())` sem restrição de origens.
- **Rotas sem rate limiting:** Nenhum mecanismo de proteção contra brute force.
- **Log de credenciais:** O `loginAdmin` faz `console.log` do username e password recebidos.
- **Sem validação de input sanitizada:** Vulnerável a ataques se dados não forem devidamente tratados antes de chegar ao SQL (embora use queries parametrizadas do mysql2, o que previne SQL Injection).

---

## 3. Frontend Colaborador (Loja)

### 3.1 Stack

- React 19.2 com hooks
- React Router DOM 7.9
- Axios para HTTP
- jsPDF + html2canvas para exportação de PDF
- React Lottie para animação de sucesso
- Vite 7.2 como bundler

### 3.2 Estrutura

```
frontend-colaborador/src/
├── App.jsx                    # Router simples (rota única "/")
├── main.jsx                   # Entry point com StrictMode
├── pages/
│   └── EmployeeOrderPage.jsx  # Página principal (~300 linhas)
├── components/
│   ├── Header.jsx             # Logo + botão catálogo PDF
│   ├── ProductList.jsx        # Busca e lista de produtos
│   └── Cart.jsx               # Carrinho com parcelas e checkout
├── services/
│   └── api.js                 # Funções de chamada à API
└── assets/
    └── success-animation.json # Animação Lottie
```

### 3.3 Fluxo do Colaborador

1. **Identifica-se pelo crachá** → Sistema busca automaticamente nome e setor via API (`/api/pedidos/employee/:cracha`). Se não encontrado, permite preenchimento manual.
2. **Busca produtos** → Filtro por código ou descrição (mínimo 2 caracteres). Produtos com preço R$ 0 são filtrados automaticamente.
3. **Monta carrinho** → Adiciona/remove itens, ajusta quantidade.
4. **Configura parcelamento** → Select de 1x a 10x (bloqueado em 1x se total < R$ 100).
5. **Aceita desconto em folha** → Checkbox obrigatório de consentimento.
6. **Confirma pedido** → POST para API, exibe tela de resumo com animação Lottie.
7. **Exporta PDF** → Captura o resumo na tela via html2canvas e gera PDF com jsPDF.

### 3.4 Detalhes Técnicos Relevantes

- **API URL dinâmica:** Usa `window.location.hostname` para montar a base URL da API (porta 3001), permitindo funcionar em qualquer host sem configuração.
- **Campos readOnly inteligentes:** Quando o crachá busca dados automaticamente, nome e setor ficam `readOnly`.
- **Aviso de entregas:** Pedidos até terça são entregues na quinta da mesma semana; após, só na semana seguinte.
- **Server de produção:** `server-colaborador.cjs` serve o build estático com Express e fallback para SPA.

---

## 4. Frontend Admin (Painel)

### 4.1 Stack

Idêntica ao frontend-colaborador, exceto sem jsPDF/html2canvas/Lottie.

### 4.2 Estrutura

```
frontend-admin/src/
├── App.jsx                  # Router com proteção de rotas
├── main.jsx
├── pages/
│   ├── AdminLoginPage.jsx   # Tela de login
│   ├── DashboardPage.jsx    # Métricas e gráficos (~200 linhas)
│   └── OrdersPage.jsx       # Gestão de pedidos (~500 linhas)
├── components/
│   └── AdminHeader.jsx      # Navbar com links + logout
└── services/
    └── api.js               # Todas as chamadas à API admin
```

### 4.3 Sistema de Autenticação (Frontend)

- Token JWT armazenado no `localStorage`.
- `App.jsx` verifica na montagem se existe token salvo.
- Rotas protegidas via redirect condicional (sem componente PrivateRoute dedicado).
- Sem verificação de expiração do token no frontend.

### 4.4 Dashboard

Exibe métricas filtradas por **ano** e **mês**:

- **Cards de métricas:** Total de pedidos, valor total, colaboradores únicos.
- **Tabelas:** Pedidos por status, pedidos por mês, top 10 produtos.
- **Cálculo inteligente:** Pedidos cancelados são excluídos das métricas no frontend (recalculados a partir da lista completa de pedidos).

### 4.5 Página de Pedidos

Funcionalidades completas:

- **Filtros de período:** Data início/fim personalizada, atalhos "Últimos 7 dias", "Esta semana", "Período 15→15" (ciclo de folha de pagamento).
- **Filtro por status:** Pendente, Concluído, Cancelado, Todos.
- **Alteração de status:** Dropdown inline na tabela com atualização otimista (atualiza UI imediatamente, reverte em caso de erro).
- **Modal de detalhes:** Exibe informações completas do pedido + itens.
- **Modal de edição:** Permite alterar itens (código, descrição, quantidade, preço), adicionar/remover itens, com recálculo automático do total. Campo de observações para justificar a edição.
- **Exportações:** Download de ficha individual (XLSX) ou relatório geral. Envio do relatório por e-mail.
- **Badge "Editado":** Pedidos alterados são marcados visualmente.

### 4.6 Funções da API (Frontend)

O arquivo `services/api.js` expõe funções bem organizadas usando mix de **Axios** (para JSON) e **fetch nativo** (para download de binários como XLSX):

- `loginAdmin`, `getDashboardData`, `listarPedidos`
- `obterPedidoDetalhado`, `editarPedido`
- `baixarFichaXlsx`, `baixarRelatorioGeralPedidosXlsx`
- `enviarRelatorioPedidosEmail`, `atualizarStatusPedido`

---

## 5. Deploy e Infraestrutura

### 5.1 PM2 (ecosystem.config.js)

Três processos gerenciados:
1. `ecommerce-backend` → `backend/src/server.js`
2. `ecommerce-colaborador` → `frontend-colaborador/server-colaborador.cjs`
3. `ecommerce-admin` → `frontend-admin/server-admin.cjs`

### 5.2 Servidores Estáticos (Produção)

Ambos os frontends usam Express simples para servir builds estáticos com **fallback SPA** (qualquer rota retorna `index.html`).

### 5.3 Variáveis de Ambiente Necessárias

```
PORT=3001
JWT_SECRET=...
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=ecommerce
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
REPORT_EMAIL=destinatario@...
REPORT_FROM="Requisições FGVTN"
NEW_ORDER_EMAIL=notificacao@...
```

---

## 6. Scripts de Importação de Dados

### 6.1 `importJson.js` — Catálogo de Produtos

Lê `produtos.json` (10.736 linhas, ~1.900 produtos) e insere como TEXT/JSON na tabela `produtos_json`. Cada importação cria um **novo registro** (versionamento implícito). O endpoint de listagem sempre busca o registro mais recente (`ORDER BY id DESC LIMIT 1`).

### 6.2 `importFuncionariosJson.js` — Base de Funcionários

Lê `infos_funcionarios_trim.json`, faz `TRUNCATE` na tabela `funcionarios_json` e insere em batch. Campos mapeados: Crachá, Nome Completo, Centro de Custo, Descrição Centro de Custo.

---

## 7. Pontos Positivos do Projeto

1. **Transações no banco:** Operações críticas (criar/editar pedidos) usam transações MySQL com rollback.
2. **Separação clara de responsabilidades:** Controllers, routes e middlewares bem separados.
3. **Queries parametrizadas:** Uso consistente de `?` placeholders, prevenindo SQL Injection.
4. **Atualização otimista na UI:** Status de pedidos atualiza instantaneamente na tela.
5. **Validações duplicadas:** Tanto frontend quanto backend validam regras de negócio (parcelas, campos obrigatórios).
6. **Período 15→15:** Funcionalidade específica para o ciclo de folha de pagamento, mostrando entendimento do negócio.
7. **Fire-and-forget para e-mails:** E-mails são disparados em background sem bloquear a resposta HTTP.
8. **Histórico de edições:** Salva valor original, marca como editado, registra observações.

---

## 8. Problemas e Melhorias Recomendadas

### 🔴 Críticos (Segurança)

| # | Problema | Local | Recomendação |
|---|---------|-------|-------------|
| 1 | **Credenciais admin hardcoded** no código-fonte | `admin.controller.js` | Mover para banco de dados com senha hasheada (bcrypt) |
| 2 | **JWT Secret fraco** como fallback | `authAdmin.js` | Obrigar via variável de ambiente, sem fallback |
| 3 | **Banco com senha root/root** hardcoded | `db.js` | Usar variáveis de ambiente para todas as credenciais |
| 4 | **Console.log de senhas** | `admin.controller.js` | Remover log de credenciais em produção |
| 5 | **CORS totalmente aberto** | `server.js` | Restringir a origens específicas |
| 6 | **Sem rate limiting** | `server.js` | Adicionar `express-rate-limit` |
| 7 | **Sem HTTPS** | Infraestrutura | Usar Nginx como reverse proxy com SSL |

### 🟡 Médios (Qualidade de Código)

| # | Problema | Recomendação |
|---|---------|-------------|
| 1 | `dotenv.config()` chamado 2 vezes no `server.js` | Remover a primeira chamada |
| 2 | Dois transporters de e-mail diferentes (Gmail direto no controller + SMTP genérico no utils) | Unificar usando apenas `utils/email.js` |
| 3 | `node_modules` incluído no ZIP (38MB) | Adicionar ao `.gitignore`, nunca versionar |
| 4 | Sem `.env.example` | Criar arquivo de exemplo com todas as variáveis necessárias |
| 5 | Dashboard faz 2 requests separados (dashboard + pedidos) para recalcular métricas | Calcular no backend excluindo cancelados |
| 6 | Sem testes automatizados | Adicionar Jest/Vitest para backend e frontend |
| 7 | Sem tratamento de token expirado no frontend | Interceptor Axios para redirect ao login quando 401 |
| 8 | Estilos inline excessivos nos componentes React | Migrar para classes CSS ou Tailwind |

### 🟢 Melhorias Futuras

| # | Sugestão |
|---|---------|
| 1 | Paginação na listagem de pedidos (atualmente carrega todos) |
| 2 | Sistema de roles com múltiplos admins no banco |
| 3 | Upload de catálogo via interface admin (não apenas via script) |
| 4 | Logs estruturados (Winston/Pino) no lugar de `console.log/error` |
| 5 | Dockerização com docker-compose (backend + MySQL + frontends) |
| 6 | Gráficos visuais (Chart.js/Recharts) no dashboard |
| 7 | Notificação em tempo real (WebSocket) quando novo pedido chega |
| 8 | Migração para TypeScript para melhor manutenibilidade |

---

## 9. Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Total de arquivos fonte | ~25 (excluindo CSS e assets) |
| Linhas de código (backend) | ~850 |
| Linhas de código (frontend-admin) | ~950 |
| Linhas de código (frontend-colaborador) | ~550 |
| Dependências backend | 7 (production) + 1 (dev) |
| Dependências frontend-admin | 4 (production) |
| Dependências frontend-colaborador | 7 (production) |
| Produtos no catálogo | ~1.900 itens |
| Funcionários na base | ~200 registros |
| Rotas da API | 13 endpoints |

---

## 10. Conclusão

O projeto é um sistema funcional e bem estruturado para seu propósito — um e-commerce interno de baixa/média complexidade. A separação em três módulos é limpa, as regras de negócio estão bem implementadas (parcelamento, desconto em folha, ciclo 15→15), e funcionalidades como geração de XLSX e envio de e-mails com anexo demonstram maturidade na solução.

Os principais pontos de atenção para um ambiente de produção real são a **segurança** (credenciais hardcoded, CORS aberto, sem rate limit) e a **escalabilidade** (sem paginação, sem cache, dashboard fazendo cálculos no frontend). Com as correções de segurança aplicadas e algumas refatorações, o sistema está pronto para uso corporativo interno.
