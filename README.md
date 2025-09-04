# SOLARIE Acessórios - Sistema de Gerenciamento de Joias

Um aplicativo web completo para gerenciamento de negócio de joias, desenvolvido com React, TypeScript e Firebase.

## 🚀 Funcionalidades

### ✨ Cadastrar Joias
- Formulário completo com todos os campos necessários
- Calculadora automática de preços (custo + margem + taxa crédito)
- Validação de dados e interface intuitiva
- Cálculo automático de frete por peça e custos totais

### 📦 Gerenciar Estoque
- Visualização completa do estoque em tabela
- Filtros avançados por código, nome, categoria e status
- Resumo com estatísticas do estoque
- Ações para visualizar, editar e excluir joias

### 🛒 Registrar Vendas
- Sistema de busca e adição de joias à venda
- Cálculo automático de totais e lucro real
- Controle de estoque durante a venda
- Múltiplas formas de pagamento
- Interface intuitiva para gerenciar itens da venda

### 📈 Histórico de Vendas
- Lista completa de todas as vendas realizadas
- Filtro por nome da cliente, data e forma de pagamento
- Estatísticas por forma de pagamento
- Resumo financeiro detalhado
- Modal com detalhes completos de cada venda

### 📊 Relatórios Completos
- Dashboard com métricas importantes do negócio
- Relatório mensal detalhado com vendas e lucros
- Análise por categoria e fornecedor
- Filtros por período para análise customizada
- Métricas de performance e lucratividade

### 💰 Gestão de Investimentos
- Cartões individuais por fornecedor (lotes)
- Acompanhamento de progresso de vendas
- Sistema de divisão de lucros configurável
- Modais para detalhes, edição e confirmação
- ROI e análise de performance por lote

## 🎨 Design e Interface

- **Interface Moderna**: Design elegante com gradientes nas cores da marca (#FFFAB8/#FFE629/#D9BB00)
- **Totalmente Responsivo**: Funciona perfeitamente em PC, tablet e mobile
- **Ícones Intuitivos**: Navegação clara com ícones do Lucide React
- **Animações Suaves**: Transições e feedback visual aprimorado
- **Tema Personalizado**: Cores e componentes customizados com Tailwind CSS

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework principal
- **TypeScript** - Tipagem estática para maior segurança
- **Vite** - Build tool rápido para desenvolvimento
- **Tailwind CSS** - Framework CSS utilitário
- **Firebase/Firestore** - Banco de dados em tempo real
- **Lucide React** - Biblioteca de ícones moderna
- **Date-fns** - Manipulação de datas

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta no Firebase (para configuração do banco de dados)

## ⚙️ Instalação e Configuração

### 1. Clone ou baixe o projeto

```bash
# Se usando Git
git clone <url-do-repositorio>
cd solarie-acessorios

# Ou extraia os arquivos em uma pasta
```

### 2. Instale as dependências

```bash
npm install
# ou
yarn install
```

### 3. Configure o Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative o Firestore Database
4. Nas configurações do projeto, obtenha as credenciais
5. Edite o arquivo `src/config/firebase.ts` e substitua as credenciais:

```typescript
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-auth-domain",
  projectId: "seu-project-id",
  storageBucket: "seu-storage-bucket",
  messagingSenderId: "seu-messaging-sender-id",
  appId: "seu-app-id"
};
```

### 4. Configure as regras do Firestore

No console do Firebase, vá para Firestore Database > Regras e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Para desenvolvimento
    }
  }
}
```

**⚠️ Importante**: Para produção, configure regras de segurança adequadas.

## 🚀 Executando o Projeto

### Modo de Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
# ou
yarn build
```

### Preview da Produção

```bash
npm run preview
# ou
yarn preview
```

## 📱 Como Usar

### 1. Cadastrar Joias
- Acesse a aba "Cadastrar Joias"
- Preencha as informações básicas (código, nome, categoria, etc.)
- Configure os custos e margens
- Os preços são calculados automaticamente
- Clique em "Salvar Joia"

### 2. Gerenciar Estoque
- Visualize todas as joias cadastradas
- Use os filtros para encontrar joias específicas
- Clique no ícone de olho para ver detalhes
- Use os ícones de edição e exclusão conforme necessário

### 3. Registrar Vendas
- Preencha os dados da cliente e venda
- Use a busca para encontrar joias
- Clique nas joias para adicionar à venda
- Ajuste quantidades e preços se necessário
- Clique em "Finalizar Venda"

### 4. Acompanhar Histórico
- Visualize todas as vendas realizadas
- Use filtros por cliente, data ou forma de pagamento
- Clique no ícone de olho para ver detalhes da venda

### 5. Visualizar Relatórios
- Acompanhe métricas gerais do negócio
- Use filtros por período para análises específicas
- Visualize relatórios por categoria e fornecedor
- Acompanhe o relatório mensal detalhado

### 6. Gestão de Investimentos
- Visualize cartões por fornecedor
- Acompanhe o progresso de vendas de cada lote
- Configure a divisão de lucros
- Analise ROI e performance

## 🔧 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── CadastrarJoias.tsx
│   ├── GerenciarEstoque.tsx
│   ├── RegistrarVendas.tsx
│   ├── HistoricoVendas.tsx
│   ├── Relatorios.tsx
│   └── GestaoInvestimentos.tsx
├── config/             # Configurações
│   └── firebase.ts
├── hooks/              # Hooks customizados
│   └── useFirestore.ts
├── types/              # Tipos TypeScript
│   └── index.ts
├── utils/              # Funções utilitárias
│   └── calculations.ts
├── App.tsx             # Componente principal
├── main.tsx            # Ponto de entrada
└── index.css           # Estilos globais
```

## 🎯 Funcionalidades Principais

### Cálculos Automáticos
- Frete por peça baseado no frete total
- Custo de aquisição incluindo todos os custos
- Preço de venda com margem e taxa de crédito
- Lucro esperado e real por venda

### Gestão de Estoque
- Controle automático de quantidades
- Status de joias (disponível/vendida)
- Filtros avançados e busca
- Estatísticas em tempo real

### Relatórios Inteligentes
- Métricas de performance
- Análise por período
- Segmentação por categoria/fornecedor
- ROI por lote de investimento

## 🔒 Segurança

- Validação de dados no frontend
- Tipagem TypeScript para prevenir erros
- Configuração segura do Firebase
- Sanitização de inputs

## 📱 Responsividade

O aplicativo foi desenvolvido com design responsivo, funcionando perfeitamente em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (até 767px)

## 🎨 Personalização

### Cores da Marca
As cores podem ser personalizadas no arquivo `tailwind.config.js`:

```javascript
colors: {
  'solarie': {
    50: '#FFFAB8',   // Mais claro
    500: '#FFE629',  // Principal
    950: '#D9BB00',  // Mais escuro
  }
}
```

### Componentes
Todos os componentes utilizam classes CSS customizadas definidas no `index.css` para facilitar a manutenção.

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique se todas as dependências foram instaladas
2. Confirme se o Firebase está configurado corretamente
3. Verifique o console do navegador para erros
4. Certifique-se de que as regras do Firestore permitem leitura/escrita

## 📄 Licença

Este projeto foi desenvolvido especificamente para SOLARIE Acessórios.

---

**Desenvolvido com ❤️ para SOLARIE Acessórios**