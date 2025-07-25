import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Current mobile app version on server
const CURRENT_SERVER_VERSION = '1.0.3';

// Version endpoint - returns the latest version available
router.get('/api/mobile/version', (req, res) => {
  try {
    console.log('[MOBILE_UPDATE] Version check requested');
    res.json({
      version: CURRENT_SERVER_VERSION,
      releaseNotes: 'Performance improvements and bug fixes',
      required: false, // Whether this update is mandatory
      downloadUrl: '/api/mobile/download'
    });
  } catch (error) {
    console.error('[MOBILE_UPDATE] Version check failed:', error);
    res.status(500).json({ error: 'Failed to check version' });
  }
});

// Download endpoint - serves the updated mobile app
router.get('/api/mobile/download', (req, res) => {
  try {
    console.log('[MOBILE_UPDATE] App download requested');
    
    // In production, this would serve the actual React Native bundle
    // For demo, we'll return the updated app source
    const mobilePath = path.join(process.cwd(), 'mobile-app', 'App.tsx');
    
    if (fs.existsSync(mobilePath)) {
      const appCode = fs.readFileSync(mobilePath, 'utf8');
      
      // Update the version in the code
      const updatedCode = appCode.replace(
        /const CURRENT_APP_VERSION = '[^']+';/,
        `const CURRENT_APP_VERSION = '${CURRENT_SERVER_VERSION}';`
      );
      
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Content-Disposition', 'attachment; filename="app-update.js"');
      res.send(updatedCode);
    } else {
      res.status(404).json({ error: 'App bundle not found' });
    }
  } catch (error) {
    console.error('[MOBILE_UPDATE] Download failed:', error);
    res.status(500).json({ error: 'Failed to download update' });
  }
});

// Force update endpoint - tells mobile apps to update immediately
router.post('/api/mobile/force-update', (req, res) => {
  try {
    console.log('[MOBILE_UPDATE] Force update triggered');
    
    // This would typically trigger push notifications to all mobile clients
    // For now, we'll just log the action
    res.json({
      success: true,
      message: 'Force update initiated',
      targetVersion: CURRENT_SERVER_VERSION
    });
  } catch (error) {
    console.error('[MOBILE_UPDATE] Force update failed:', error);
    res.status(500).json({ error: 'Failed to initiate force update' });
  }
});

export default router;