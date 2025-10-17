import express from 'express';

import * as controller from './Controller.js'

import * as multer from './config/multerConfig.js'

/* Routing */
const router = express.Router();

/* Transcription */
router.post('/whizard', multer.upload.array('audioVideoFile'), controller.transcribeAndtranslate);

/* File download */
router.get("/download/:file", controller.downloadFile);

export default router;