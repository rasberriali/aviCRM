const fs = require('fs');

function setupUserRoutes(app) {
  // Get users (for project assignment)
  app.get('/api/users', (req, res) => {
    try {
      console.log('[USERS] GET /api/users');
      
      const usersPath = '/mnt/server_data/users.json';
      let users = [];
      
      if (fs.existsSync(usersPath)) {
        const userData = fs.readFileSync(usersPath, 'utf8');
        users = JSON.parse(userData);
        
        // Return users without passwords for security
        const safeUsers = users.map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        
        console.log(`[USERS] Loaded ${safeUsers.length} users`);
        res.json(safeUsers);
      } else {
        console.log('[USERS] No users file found');
        res.json([]);
      }
    } catch (error) {
      console.error('[USERS] Error loading users:', error);
      res.status(500).json({ error: 'Failed to load users' });
    }
  });
}

module.exports = setupUserRoutes;