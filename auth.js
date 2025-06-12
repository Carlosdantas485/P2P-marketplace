const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('./data.json');

module.exports = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Compare the provided password with the hashed password
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result) {
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        'your-secret-key', // Use a proper secret key in production
        { expiresIn: '1h' }
      );

      // Return token and user data (excluding password)
      const { password, ...userData } = user;
      return res.status(200).json({ token, user: userData });
    }

    return res.status(401).json({ error: 'Invalid email or password' });
  });
};
