const multer = require('multer');
const fs = require('fs');

const inferenceStorage = multer.memoryStorage();

const transcriptionStorage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            const uploadDir = `${process.env.WHISPER_UPLOAD_DIR}/transcriptions`;

            if(fs.existsSync(uploadDir) == false){
                fs.mkdirSync(uploadDir, {recursive: true});
            } 
            cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
    }
);

const translationStorage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            const uploadDir = `${process.env.WHISPER_UPLOAD_DIR}/translations`;

            if(fs.existsSync(uploadDir) == false){
                fs.mkdirSync(uploadDir, {recursive: true});
            } 
            cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
    }
);

const uploadTranscription = multer({storage: transcriptionStorage});
const uploadTranslation = multer({storage: translationStorage});
const upload = multer({storage: inferenceStorage});

module.exports = 
{
    uploadTranscription,
    uploadTranslation,
    upload
}