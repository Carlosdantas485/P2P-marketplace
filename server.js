require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Função auxiliar para ler o arquivo JSON
const readData = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler data.json:', error);
        return { users: [], skins: [] };
    }
};

const saveData = (data) => {
    try {
        fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar data.json:', error);
    }
};

// Rota de registro
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const data = readData();
        
        // Verificar se o usuário já existe
        const existingUser = data.users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        // Criptografar senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            foto: '',
            saldo: 0,
            nivel: 1,
            vendas: 0,
            historicoTransferencias: [],
            inventory: []
        };

        data.users.push(newUser);
        saveData(data);
        
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar usuário' });
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const data = readData();
        
        const user = data.users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ message: 'Usuário não encontrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Senha inválida' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao fazer login' });
    }
});

// Rota para listar skins à venda (pública)
app.get('/skins', (req, res) => {
    try {
        const data = readData();
        const skinsForSale = data.skins.filter(skin => skin.venda);
        res.json(skinsForSale);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar skins' });
    }
});

// Rota para obter perfil do usuário
app.get('/users/:id', (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id.toString() === req.params.id.toString());
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.json({ ...user, password: undefined });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter perfil do usuário' });
    }
});

// Rota para atualizar perfil do usuário
app.put('/users/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, foto } = req.body;
        const data = readData();
        
        const userIndex = data.users.findIndex(u => u.id.toString() === id.toString());
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se o usuário é o mesmo que está fazendo a requisição
        if (req.user.id.toString() !== id.toString()) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        // Atualizar dados do usuário
        data.users[userIndex] = {
            ...data.users[userIndex],
            username,
            email,
            foto
        };

        saveData(data);
        res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil do usuário' });
    }
});

// Rota para listar skins do usuário
app.get('/skins/:ownerId', (req, res) => {
    try {
        const data = readData();
        const userSkins = data.skins.filter(skin => skin.ownerId === req.params.ownerId);
        res.json(userSkins);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar skins do usuário' });
    }
});

// Rota para atualizar status de venda da skin
app.patch('/skins/:skinId', authenticateToken, async (req, res) => {
    try {
        const { skinId } = req.params;
        const { venda } = req.body;
        const data = readData();
        
        const skin = data.skins.find(s => s.id === skinId);
        if (!skin) {
            return res.status(404).json({ message: 'Skin não encontrada' });
        }

        // Verificar se o usuário é o dono da skin
        if (skin.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        skin.venda = venda;
        skin.updated_at = new Date().toISOString();
        
        saveData(data);
        res.json({ message: 'Status de venda atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status de venda' });
    }
});

// Rota para listar histórico (requer autenticação)
app.get('/history', authenticateToken, (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.json(user.historicoTransferencias);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar histórico' });
    }
});

// Rota para listar inventário (requer autenticação)
app.get('/inventory/:userId', authenticateToken, (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id === req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        const inventory = data.skins.filter(skin => 
            user.inventory.includes(skin.id) && !skin.venda
        );
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar inventário' });
    }
});

// Rota para comprar skin (requer autenticação)
app.post('/buy', authenticateToken, async (req, res) => {
    try {
        const { skinId } = req.body;
        const data = readData();
        const buyer = data.users.find(u => u.id === req.user.id);
        const skin = data.skins.find(s => s.id === skinId);
        
        if (!skin || !skin.venda) {
            return res.status(404).json({ message: 'Skin não encontrada ou não está à venda' });
        }

        const seller = data.users.find(u => u.id === skin.idDono);
        if (!seller) {
            return res.status(404).json({ message: 'Vendedor não encontrado' });
        }

        if (buyer.saldo < skin.preco) {
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }

        // Realizar transação
        buyer.saldo -= skin.preco;
        seller.saldo += skin.preco;
        seller.vendas++;

        // Atualizar inventário
        skin.venda = false;
        seller.inventory = seller.inventory.filter(id => id !== skin.id);
        buyer.inventory.push(skin.id);

        // Registrar histórico
        const now = new Date().toISOString();
        buyer.historicoTransferencias.push({
            tipo: "COMPRA",
            skinId: skin.id,
            skinNome: skin.nome,
            preco: skin.preco,
            data: now,
            de: seller.id
        });

        seller.historicoTransferencias.push({
            tipo: "VENDA",
            skinId: skin.id,
            skinNome: skin.nome,
            preco: skin.preco,
            data: now,
            para: buyer.id
        });

        skin.idDono = buyer.id;
        
        saveData(data);
        res.json({ message: 'Compra realizada com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao realizar compra' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
