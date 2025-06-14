require('dotenv').config();
const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para autenticação
const authenticateToken = (req, res, next) => {
    console.log('=== NOVA REQUISIÇÃO AUTENTICADA ===');
    console.log('URL:', req.originalUrl);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('Authorization Header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extraído:', token ? `${token.substring(0, 10)}...` : 'não encontrado');
    
    if (!token) {
        console.log('Erro: Nenhum token fornecido');
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) {
            console.error('Erro ao verificar token:', err.message);
            console.error('Token expirado?', err.name === 'TokenExpiredError');
            console.error('Token inválido?', err.name === 'JsonWebTokenError');
            return res.status(403).json({ 
                message: 'Token inválido ou expirado',
                error: err.message 
            });
        }
        
        console.log('Token decodificado com sucesso:', JSON.stringify(decoded, null, 2));
        
        if (!decoded || !decoded.id) {
            console.error('Token não contém ID do usuário');
            return res.status(403).json({ message: 'Token inválido - ID do usuário não encontrado' });
        }
        
        // Adiciona o usuário ao request
        req.user = { id: decoded.id };
        console.log('Usuário autenticado:', req.user);
        
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

// Rota para alteração de senha
app.post('/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // Corrigido de req.user.userId para req.user.id
        const data = readData();
        
        // Encontra o usuário
        const user = data.users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuário não encontrado.' 
            });
        }

        // Verifica a senha atual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Senha atual incorreta.' 
            });
        }

        // Atualiza a senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        // Salva as alterações
        await saveData(data);
        
        res.json({ 
            success: true, 
            message: 'Senha alterada com sucesso.' 
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ocorreu um erro ao alterar a senha.' 
        });
    }
});

// Rota de recuperação de senha
app.post('/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const data = readData();
        
        // Verifica se o email existe
        const user = data.users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhuma conta encontrada com este e-mail.' 
            });
        }

        // Gera um token de redefinição
        const resetToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Salva o token no usuário
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await saveData(data);

        // URL de redefinição
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;

        // Envia o e-mail
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Sistema'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Redefinição de Senha',
            html: `
                <h2>Redefinição de Senha</h2>
                <p>Você solicitou a redefinição de senha. Clique no link abaixo para criar uma nova senha:</p>
                <p><a href="${resetUrl}">Redefinir Senha</a></p>
                <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
                <p>O link expirará em 1 hora.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            message: 'Enviamos um e-mail com as instruções para redefinir sua senha.' 
        });
    } catch (error) {
        console.error('Erro ao processar recuperação de senha:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ocorreu um erro ao processar sua solicitação.' 
        });
    }
});

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
            wishlist: [] // Initialize wishlist
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
        console.log('=== TENTATIVA DE LOGIN ===');
        console.log('Email recebido:', req.body.email);
        
        const { email, password } = req.body;
        const data = readData();
        
        console.log('Usuários no banco de dados:', data.users.map(u => ({ id: u.id, email: u.email })));
        
        const user = data.users.find(u => u.email === email);
        if (!user) {
            console.log('Usuário não encontrado para o email:', email);
            return res.status(400).json({ message: 'Usuário não encontrado' });
        }

        console.log('Usuário encontrado:', { id: user.id, email: user.email });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Senha inválida para o usuário:', user.email);
            return res.status(400).json({ message: 'Senha inválida' });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log('Token gerado:', token);
        
        // Removendo a senha antes de enviar a resposta
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ 
            success: true,
            token, 
            user: userWithoutPassword 
        });
    } catch (error) {
        console.error('Erro durante o login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao fazer login',
            error: error.message 
        });
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

        // Add to transaction history
        const depositRecord = {
            type: 'deposito',
            amount: amount,
            date: new Date().toISOString()
        };
        if (!data.users[userIndex].historicoTransferencias) {
            data.users[userIndex].historicoTransferencias = [];
        }
        data.users[userIndex].historicoTransferencias.push(depositRecord);
        
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
app.get('/api/history', authenticateToken, (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Sort history by date, descending
        const sortedHistory = (user.historicoTransferencias || []).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(sortedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
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

// Rota para comprar skins (múltiplos ou único) (requer autenticação)
app.post('/buy', authenticateToken, async (req, res) => {
    console.log('--- BUY REQUEST (SUPPORTS MULTIPLE ITEMS) ---');
    const buyerId = req.user.id;
    let skinIds = req.body.skinIds;
    const singleSkinId = req.body.skinId;

    // Compatibilidade: se vier skinId único, transforma em array
    if (!skinIds && singleSkinId) {
        skinIds = [singleSkinId];
    }
    if (!Array.isArray(skinIds) || skinIds.length === 0) {
        return res.status(400).json({ message: 'skinIds deve ser um array de IDs de skins.' });
    }

    try {
        const data = readData();
        const buyerIndex = data.users.findIndex(u => u.id === buyerId);
        if (buyerIndex === -1) {
            return res.status(404).json({ message: 'Comprador não encontrado.' });
        }
        const buyer = data.users[buyerIndex];

        let results = [];
        for (const skinId of skinIds) {
            const skinIndex = data.skins.findIndex(s => s.id == skinId);
            if (skinIndex === -1) {
                results.push({ skinId, sucesso: false, erro: 'Skin não encontrada.' });
                continue;
            }
            const skin = data.skins[skinIndex];
            const sellerIndex = data.users.findIndex(u => u.id === skin.ownerId);
            if (sellerIndex === -1) {
                results.push({ skinId, sucesso: false, erro: 'Vendedor da skin não foi encontrado.' });
                continue;
            }
            if (!skin.venda) {
                results.push({ skinId, sucesso: false, erro: 'Esta skin não está à venda.' });
                continue;
            }
            if (skin.ownerId === buyer.id) {
                results.push({ skinId, sucesso: false, erro: 'Você não pode comprar sua própria skin.' });
                continue;
            }
            if (buyer.saldo < skin.preco) {
                results.push({ skinId, sucesso: false, erro: 'Saldo insuficiente para realizar a compra.' });
                continue;
            }

            // --- 3. Execute Transaction (Balances & Ownership) ---
            data.users[buyerIndex].saldo -= skin.preco;
            data.users[sellerIndex].saldo += skin.preco;
            data.skins[skinIndex].ownerId = buyer.id;
            data.skins[skinIndex].venda = false;

            // --- 4. Record Transaction History ---
            const seller = data.users[sellerIndex];
            const transactionDate = new Date().toISOString();

            // For Buyer
            const purchaseRecord = {
                type: 'compra',
                skinId: skin.id,
                skinName: skin.nome,
                price: skin.preco,
                sellerUsername: seller.username,
                date: transactionDate
            };
            if (!buyer.historicoTransferencias) {
                buyer.historicoTransferencias = [];
            }
            buyer.historicoTransferencias.push(purchaseRecord);

            // For Seller
            const saleRecord = {
                type: 'venda',
                skinId: skin.id,
                skinName: skin.nome,
                price: skin.preco,
                buyerUsername: buyer.username,
                date: transactionDate
            };
            if (!seller.historicoTransferencias) {
                seller.historicoTransferencias = [];
            }
            seller.historicoTransferencias.push(saleRecord);

            results.push({ skinId, sucesso: true });
        }

        // --- 5. Save and Respond ---
        await saveData(data);
        console.log(`Purchase(s) processed: User ${buyer.id} bought skins: ${skinIds.join(', ')}.`);
        const updatedBuyer = data.users[buyerIndex];
        res.json({ 
            message: 'Processamento de compra(s) finalizado.',
            results,
            user: { ...updatedBuyer, password: undefined }
        });
    } catch (error) {
        console.error('--- ERROR PROCESSING PURCHASE(S) ---', error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao processar a compra.' });
    }
});

// --- Buy Multiple Skins Endpoint ---
app.post('/buy-multiple', authenticateToken, async (req, res) => {
    try {
        const { skinIds } = req.body;
        const userId = req.user.id;
        const data = readData();

        const buyerIndex = data.users.findIndex(u => u.id == userId);
        if (buyerIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const buyer = data.users[buyerIndex];
        const results = [];

        for (const skinId of skinIds) {
            const skin = data.skins.find(s => s.id == skinId && s.venda);
            if (!skin) {
                results.push({ skinId, sucesso: false, erro: 'Skin não encontrada ou não está à venda.' });
                continue;
            }
            if (buyer.inventory.includes(skinId)) {
                results.push({ skinId, sucesso: false, erro: 'Você já possui esta skin.' });
                continue;
            }
            if (buyer.saldo < skin.preco) {
                results.push({ skinId, sucesso: false, erro: 'Saldo insuficiente.' });
                continue;
            }

            // Encontrar vendedor pelo ownerId da skin ou pelo inventário
            let sellerIndex = -1;
            if (skin.ownerId) {
                sellerIndex = data.users.findIndex(u => u.id == skin.ownerId);
            }
            if (sellerIndex === -1) {
                sellerIndex = data.users.findIndex(u => u.inventory.includes(skinId));
            }
            if (sellerIndex === -1) {
                results.push({ skinId, sucesso: false, erro: 'Vendedor não encontrado.' });
                continue;
            }
            const seller = data.users[sellerIndex];

            // Transferir skin
            seller.inventory = seller.inventory.filter(id => id != skinId);
            buyer.inventory.push(skinId);
            // Atualizar o ownerId da skin para o comprador
            skin.ownerId = buyer.id;

            // Atualizar saldos
            buyer.saldo -= skin.preco;
            seller.saldo += skin.preco;

            // Remover da venda
            skin.venda = false;

            // Registrar transação para o vendedor
            const transactionDate = new Date().toISOString();
            const saleRecord = {
                type: 'venda',
                skinId,
                skinName: skin.nome,
                price: skin.preco,
                buyerUsername: buyer.username,
                buyerId: buyer.id,
                date: transactionDate
            };
            seller.historicoTransferencias = seller.historicoTransferencias || [];
            seller.historicoTransferencias.push(saleRecord);

            // Registrar transação para o comprador
            const buyRecord = {
                type: 'compra',
                skinId,
                skinName: skin.nome,
                price: skin.preco,
                sellerUsername: seller.username,
                sellerId: seller.id,
                date: transactionDate
            };
            buyer.historicoTransferencias = buyer.historicoTransferencias || [];
            buyer.historicoTransferencias.push(buyRecord);

            results.push({ skinId, sucesso: true });
        }

        await saveData(data);
        const updatedBuyer = data.users[buyerIndex];
        res.json({
            message: 'Processamento de compra(s) finalizado.',
            results,
            user: { ...updatedBuyer, password: undefined }
        });
    } catch (error) {
        console.error('--- ERROR PROCESSING PURCHASE(S) ---', error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao processar a compra.' });
    }
});

// --- Wishlist API Endpoints ---

// Get user's wishlist
app.get('/api/wishlist', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const data = readData();
        const user = data.users.find(u => u.id == userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const wishlistSkins = (user.wishlist || []).map(skinId => {
            return data.skins.find(s => s.id == skinId);
        }).filter(Boolean); // filter out nulls if a skin is not found

        res.status(200).json(wishlistSkins);
    } catch (error) {
        console.error('Erro ao buscar a wishlist:', error);
        res.status(500).json({ message: 'Erro ao buscar a lista de desejos.' });
    }
});

// Add item to wishlist
app.post('/api/wishlist', authenticateToken, async (req, res) => {
    try {
        const { skinId } = req.body;
        const userId = req.user.id;
        const data = readData();

        const userIndex = data.users.findIndex(u => u.id == userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const skinExists = data.skins.some(s => s.id == skinId);
        if (!skinExists) {
            return res.status(404).json({ message: 'Skin não encontrada.' });
        }

        const user = data.users[userIndex];
        if (!user.wishlist) {
            user.wishlist = [];
        }

        if (user.wishlist.some(id => id == skinId)) {
            return res.status(400).json({ message: 'Item já está na sua lista de desejos.' });
        }

        user.wishlist.push(skinId);
        await saveData(data);

        res.status(200).json({ message: 'Item adicionado à lista de desejos com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar à wishlist:', error);
        res.status(500).json({ message: 'Erro ao adicionar item à lista de desejos.' });
    }
});

// Remove item from wishlist
app.delete('/api/wishlist/:skinId', authenticateToken, async (req, res) => {
    try {
        const { skinId } = req.params;
        const userId = req.user.id;
        const data = readData();

        const userIndex = data.users.findIndex(u => u.id == userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const user = data.users[userIndex];
        if (!user.wishlist || !user.wishlist.some(id => id == skinId)) {
            return res.status(404).json({ message: 'Item não encontrado na lista de desejos.' });
        }

        user.wishlist = user.wishlist.filter(id => id != skinId);
        await saveData(data);

        res.status(200).json({ message: 'Item removido da lista de desejos com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover da wishlist:', error);
        res.status(500).json({ message: 'Erro ao remover item da lista de desejos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
