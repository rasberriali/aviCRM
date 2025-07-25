import { Router } from 'express';
import path from 'path';

const router = Router();

router.get('/android-modern-ui', (req, res) => {
  const filePath = path.join(process.cwd(), 'standalone-android-app', 'avi-crm-android-modern-ui.zip');
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="avi-crm-android-modern-ui.zip"');
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending Android app file:', err);
      res.status(404).json({ error: 'Android app package not found' });
    }
  });
});

export { router as androidDownloadRouter };