const bcrypt = require('bcryptjs');
const fs = require('fs');

// Senhas para hash
const passwords = {
    'carlosdantas485@gmail.com': '123456',
    'skinhunter@gmail.com': '123456'
};

// Ler o arquivo atual
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Atualizar as senhas hashadas
for (const user of data.users) {
    const password = passwords[user.email];
    if (password) {
        user.password = bcrypt.hashSync(password, 10);
    }
}

// Salvar o arquivo atualizado
fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
console.log('Senhas atualizadas com sucesso!');
