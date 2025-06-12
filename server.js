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

const DB_PATH = path.join(__dirname, 'data.json');

const saveData = async (data) => {
    try {
        await fs.promises.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
        console.log('--- saveData: Successfully wrote to db.json ---');
    } catch (error) {
        console.error("--- saveData: ERROR writing to db.json ---", error);
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
            inventory: [],
            wishlist: []
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

// Rota para criar uma nova skin
app.post('/skins', authenticateToken, (req, res) => {
    try {
        const data = readData();
        const { nome, descricao, imagem, float } = req.body;

        if (!nome || !descricao || !imagem) {
            return res.status(400).json({ message: 'Nome, descrição e URL da imagem são obrigatórios.' });
        }

        const newSkin = {
            id: String(Date.now() + Math.random()), // Simple unique ID
            ownerId: req.user.id,
            nome,
            descricao,
            imagem,
            float: float || 0,
            venda: false,
            preco: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        data.skins.push(newSkin);
        saveData(data);
        res.status(201).json(newSkin);
    } catch (error) {
        console.error('Erro ao criar skin:', error);
        res.status(500).json({ message: 'Erro ao criar a skin.' });
    }
});

// Rota para atualizar uma skin (editar nome, descrição, etc.)
app.put('/skins/:skinId', authenticateToken, (req, res) => {
    try {
        const { skinId } = req.params;
        const { nome, descricao, imagem, float } = req.body;
        const data = readData();
        
        const skinIndex = data.skins.findIndex(s => s.id === skinId);
        if (skinIndex === -1) {
            return res.status(404).json({ message: 'Skin não encontrada' });
        }

        if (data.skins[skinIndex].ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado a editar esta skin.' });
        }

        data.skins[skinIndex] = {
             ...data.skins[skinIndex],
             nome: nome || data.skins[skinIndex].nome,
             descricao: descricao || data.skins[skinIndex].descricao,
             imagem: imagem || data.skins[skinIndex].imagem,
             float: float || data.skins[skinIndex].float,
             updated_at: new Date().toISOString()
        };
        saveData(data);
        res.json(data.skins[skinIndex]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar a skin.' });
    }
});

// Rota para deletar uma skin
// Rota para adicionar item à wishlist
app.post('/api/wishlist', authenticateToken, (req, res) => {
    try {
        const { skinId } = req.body;
        const userId = req.user.id;
        const data = readData();

        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        if (!data.users[userIndex].wishlist) {
            data.users[userIndex].wishlist = [];
        }

        if (data.users[userIndex].wishlist.includes(skinId)) {
            return res.status(400).json({ message: 'Item já está na sua lista de desejos.' });
        }

        data.users[userIndex].wishlist.push(skinId);
        saveData(data);

        res.status(200).json({ message: 'Item adicionado à lista de desejos com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar à wishlist:', error);
        res.status(500).json({ message: 'Erro ao adicionar item à lista de desejos.' });
    }
});

app.delete('/skins/:skinId', authenticateToken, (req, res) => {
    try {
        const { skinId } = req.params;
        const data = readData();
        
        const skinIndex = data.skins.findIndex(s => s.id === skinId);
        if (skinIndex === -1) {
            return res.status(404).json({ message: 'Skin não encontrada' });
        }

        if (data.skins[skinIndex].ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado a deletar esta skin.' });
        }

        data.skins.splice(skinIndex, 1);
        saveData(data);
        res.status(204).send(); // No Content
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar a skin.' });
    }
});

// Rota para atualizar status de venda da skin
app.patch('/skins/:skinId', authenticateToken, async (req, res) => {
    try {
        const { skinId } = req.params;
        const { venda, preco } = req.body; // Extrair venda e preco
        const data = readData();
        
        const skinIndex = data.skins.findIndex(s => s.id === skinId);
        if (skinIndex === -1) {
            return res.status(404).json({ message: 'Skin não encontrada' });
        }

        // Verificar se o usuário é o dono da skin
        if (data.skins[skinIndex].ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        // Atualizar os campos
        data.skins[skinIndex].venda = venda;
        if (preco !== undefined) { // Apenas atualiza o preço se for fornecido
            data.skins[skinIndex].preco = preco;
        }
        data.skins[skinIndex].updated_at = new Date().toISOString();
        
        saveData(data);
        // Retorna a skin atualizada
        res.json(data.skins[skinIndex]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status de venda' });
    }
});

// Rota para depositar saldo (requer autenticação)
app.post('/deposit', authenticateToken, async (req, res) => {
    console.log('--- DEPOSIT REQUEST RECEIVED ---');
    try {
        const { amount } = req.body;
        const userId = req.user.id;
        console.log(`User ID from token: ${userId}, Amount: ${amount}`);

        if (typeof amount !== 'number' || amount <= 0) {
            console.log('Validation failed: Invalid amount.');
            return res.status(400).json({ message: 'O valor do depósito deve ser um número positivo.' });
        }

        const data = readData();
        const userIndex = data.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            console.log(`User with ID ${userId} not found in database.`);
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        console.log(`User balance BEFORE deposit: ${data.users[userIndex].saldo}`);
        data.users[userIndex].saldo += amount;
        console.log(`User balance AFTER deposit: ${data.users[userIndex].saldo}`);
        
        await saveData(data);

        console.log('Deposit successful. Sending updated user data.');
        res.json({ 
            message: 'Depósito realizado com sucesso',
            user: { ...data.users[userIndex], password: undefined } 
        });

    } catch (error) {
        console.error('--- ERROR PROCESSING DEPOSIT ---', error);
        res.status(500).json({ message: 'Erro interno ao processar o depósito.' });
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
    console.log('--- BUY REQUEST (OWNERSHIP ONLY) ---');
    const { skinId } = req.body;
    const buyerId = req.user.id;

    try {
        const data = readData();

        // --- 1. Find Entities ---
        const buyerIndex = data.users.findIndex(u => u.id === buyerId);
        const skinIndex = data.skins.findIndex(s => s.id === skinId);

        // --- 2. Validation ---
        if (buyerIndex === -1) {
            return res.status(404).json({ message: 'Comprador não encontrado.' });
        }
        if (skinIndex === -1) {
            return res.status(404).json({ message: 'Skin não encontrada.' });
        }

        const buyer = data.users[buyerIndex];
        const skin = data.skins[skinIndex];
        const sellerIndex = data.users.findIndex(u => u.id === skin.ownerId);

        if (sellerIndex === -1) {
            return res.status(404).json({ message: 'Vendedor da skin não foi encontrado.' });
        }
        if (!skin.venda) {
            return res.status(400).json({ message: 'Esta skin não está à venda.' });
        }
        if (skin.ownerId === buyer.id) {
            return res.status(400).json({ message: 'Você não pode comprar sua própria skin.' });
        }
        if (buyer.saldo < skin.preco) {
            return res.status(400).json({ message: 'Saldo insuficiente para realizar a compra.' });
        }

        // --- 3. Execute Transaction (Balances & Ownership) ---
        
        // Update balances
        data.users[buyerIndex].saldo -= skin.preco;
        data.users[sellerIndex].saldo += skin.preco;

        // Update skin ownership and status
        data.skins[skinIndex].ownerId = buyer.id;
        data.skins[skinIndex].venda = false;

        // --- 4. Save and Respond ---
        await saveData(data);
        console.log(`Purchase successful: User ${buyer.id} bought skin ${skin.id}.`);

        // Return the updated buyer object to sync frontend state
        const updatedBuyer = data.users[buyerIndex];
        res.json({ 
            message: 'Compra realizada com sucesso!',
            user: { ...updatedBuyer, password: undefined } 
        });

    } catch (error) {
        console.error('--- ERROR PROCESSING PURCHASE ---', error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao processar a compra.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
