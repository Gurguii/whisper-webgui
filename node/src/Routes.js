// Import standard Node modules using default imports
import express from 'express';

// Import local controller (assuming Controller.js uses 'export default controller')
import * as controller from './Controller.js'

// Import named exports from config/multerConfig.js
// Note: The import path needs to include the file extension (.js or .mjs)
import * as multer from './config/multerConfig.js'

/* Routing */
const router = express.Router();

/* Transcription */
router.post('/whizard', multer.upload.array('audioVideoFile'), controller.transcribeAndtranslate);

/* File download */
router.get("/download/:file", controller.downloadFile);

// Export the router instance as the default export
// This replaces: module.exports = router;
export default router;