const fs = require('fs');

// Authentication endpoint
function setupAuthRoutes(app) {
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`[AUTH] Login attempt for: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Load users from /mnt/server_data/users.json
      let users = [];
      const usersPath = '/mnt/server_data/users.json';
      
      try {
        if (fs.existsSync(usersPath)) {
          const userData = fs.readFileSync(usersPath, 'utf8');
          users = JSON.parse(userData);
          console.log(`[AUTH] Loaded ${users.length} users from server data`);
        } else {
          console.log(`[AUTH] Users file not found at ${usersPath}`);
          return res.status(500).json({
            success: false,
            message: 'User database not available'
          });
        }
      } catch (error) {
        console.error('[AUTH] Error loading users:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to load user database'
        });
      }

      // Find user by username or email
      const user = users.find(u => 
        (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === username.toLowerCase())
      );

      if (!user || user.password !== password || !user.active) {
        console.log(`[AUTH] Authentication failed for: ${username}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      console.log(`[AUTH] Authentication successful for: ${user.firstName} ${user.lastName}`);

      // Return user data without password
      const { password: _, ...userData } = user;
      
      res.json({
        success: true,
        user: userData,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('[AUTH] Server error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
}

module.exports = setupAuthRoutes;