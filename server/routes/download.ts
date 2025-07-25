import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Docker build download endpoint
router.get('/dockerbuild', (req, res) => {
  const dockerBuildPath = path.join(process.cwd(), 'dockerbuild.zip');
  
  if (!fs.existsSync(dockerBuildPath)) {
    return res.status(404).json({ error: 'Docker build package not found' });
  }

  res.download(dockerBuildPath, 'avi-crm-desktop-dockerbuild.zip', (err) => {
    if (err) {
      console.error('Docker build download error:', err);
      res.status(500).json({ error: 'Failed to download Docker build package' });
    }
  });
});

export default router;