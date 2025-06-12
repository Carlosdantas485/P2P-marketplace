# Skin Marketplace API

API para marketplace de skins com autenticação JWT e armazenamento em JSON.

## Endpoints

### Autenticação

- POST `/register` - Registrar novo usuário
- POST `/login` - Fazer login

### Skins

- GET `/skins` - Listar skins à venda (público)
- POST `/buy` - Comprar skin (requer autenticação)

### Usuário

- GET `/history` - Ver histórico de transações (requer autenticação)
- GET `/inventory/:userId` - Ver inventário do usuário (requer autenticação)

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```
3. Configure as variáveis de ambiente (JWT_SECRET)
4. Execute o servidor:
```bash
npm start
```

## Tecnologias

- Node.js
- Express
- JSON Web Tokens (JWT)
- bcryptjs (criptografia de senha)
- UUID (geração de IDs únicos)
- CORS
- dotenv (variáveis de ambiente)
# P2P-marketplace
