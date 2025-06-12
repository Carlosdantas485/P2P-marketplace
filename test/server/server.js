const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// JWT secret
const JWT_SECRET = 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token inválido' });
  }
};

// Get all skins (public route)
app.get('/skins', (req, res) => {
  res.json(skins);
});

// Get single skin by ID (public route)
app.get('/skins/:id', (req, res) => {
  const skin = skins.find(s => s.id === parseInt(req.params.id));
  if (!skin) {
    return res.status(404).json({ message: 'Skin not found' });
  }
  res.json(skin);
});

// User registration (public route)
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data.json', 'utf8')) || [];
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      foto: '',
      saldo: 0,
      nivel: 1,
      vendas: 0
    };

    users.push(newUser);
    fs.writeFileSync('data.json', JSON.stringify(users, null, 2));

    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { ...newUser, password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User login (public route)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data.json', 'utf8')) || [];
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Protected routes (require token)
app.get('/users/:id', authenticateToken, (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync('data.json', 'utf8')) || [];
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

app.put('/users/:id', authenticateToken, (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync('data.json', 'utf8')) || [];
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o usuário é o mesmo que está fazendo a requisição
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Atualizar dados do usuário
    const { username, email, foto } = req.body;
    const updatedUser = {
      ...users[userIndex],
      username,
      email,
      foto
    };

    users[userIndex] = updatedUser;
    fs.writeFileSync('data.json', JSON.stringify(users, null, 2));
    
    res.json({ 
      message: 'Perfil atualizado com sucesso',
      user: { ...updatedUser, password: undefined }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil do usuário' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
