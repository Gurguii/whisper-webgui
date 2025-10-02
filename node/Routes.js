const express = require('express');
const router = express.Router();
const controller = require('./Controller.js');
const { uploadTranscription, uploadTranslation, upload } = require('./config/multerConfig.js')

router.get('/', (req, res) => {res.status(200).json({message: "Hello World"})})


router.post('/whizard', upload.array('audioVideoFile'), controller.transcribeAndtranslate)

/* File processing status */
router.get("/status/:jobid", controller.getJobStatus);

/* File download */
router.get("/download/:file", controller.downloadFile);

module.exports = router;