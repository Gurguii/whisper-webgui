import multer from 'multer';

const inferenceStorage = multer.memoryStorage();

export const upload = multer({storage: inferenceStorage});