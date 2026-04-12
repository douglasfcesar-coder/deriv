# 📊 Deriv Monitor

Monitor inteligente para robôs da Deriv com sugestões de IA e alertas no Telegram.

## O que faz

- **Conecta em tempo real** via WebSocket com sua conta Deriv
- **Exibe métricas** do robô: win rate, lucro, fator de lucro, sequência de perdas, curva de equity
- **IA analisa** o desempenho e sugere melhorias específicas para Deriv Bot (Blockly)
- **Alerta no Telegram** automaticamente quando detecta problemas (sequência de perdas, win rate crítico, etc.)

---

## 🚀 Deploy rápido na Vercel (grátis)

### 1. Instalar Node.js
Baixe em https://nodejs.org (versão 18+)

### 2. Instalar dependências
```bash
cd deriv-monitor
npm install
```

### 3. Testar localmente
```bash
npm run dev
# Acesse http://localhost:3000
```

### 4. Deploy na Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login na Vercel
vercel login

# Deploy (primeira vez)
vercel

# Deploys futuros
vercel --prod
```

A Vercel vai te dar uma URL pública tipo `https://deriv-monitor-xyz.vercel.app`.

---

## ⚙️ Configuração

### API Token da Deriv
1. Acesse [app.deriv.com](https://app.deriv.com)
2. Vá em **Configurações → Tokens de API**
3. Crie um token com permissão **Read**
4. Cole no app ao fazer login

### Alertas no Telegram
1. Abra o Telegram e busque `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Copie o **token** do bot criado
4. Fale com seu bot e acesse:
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
5. Copie o `chat.id` da resposta
6. No app: vá em **Config** e cole o token e o chat ID
7. Clique em **Enviar teste** para confirmar

---

## 📁 Estrutura do projeto

```
deriv-monitor/
├── src/
│   ├── components/
│   │   ├── AIPanel.jsx        # Painel de sugestões da IA
│   │   ├── MetricCard.jsx     # Card de métricas
│   │   └── SettingsPanel.jsx  # Config do Telegram
│   ├── hooks/
│   │   └── useDerivWS.js      # Conexão WebSocket com Deriv
│   ├── lib/
│   │   ├── analytics.js       # Cálculo de métricas
│   │   └── telegram.js        # Envio de alertas
│   ├── pages/
│   │   ├── LoginScreen.jsx    # Tela de login
│   │   └── Dashboard.jsx      # Dashboard principal
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🔔 Regras de alerta automático

| Condição | Nível |
|---|---|
| Sequência de ≥ 5 perdas | 🔴 Crítico |
| Win rate < 40% (mín. 10 ops) | 🔴 Crítico |
| Perda acumulada > $50 | 🔴 Crítico |
| Fator de lucro < 0.8 | 🟡 Atenção |

---

## 🔒 Segurança

- O API Token da Deriv é armazenado apenas em `sessionStorage` (some ao fechar o navegador)
- O token do Telegram fica em `localStorage` do seu próprio dispositivo
- Nenhum dado é enviado para servidores externos além da Deriv e do Telegram

---

## 🛠️ Tecnologias

- React 18 + Vite
- Recharts (gráficos)
- Deriv WebSocket API v3
- Claude API (Anthropic) para sugestões
- Telegram Bot API para alertas
