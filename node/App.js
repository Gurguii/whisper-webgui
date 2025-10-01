require('dotenv').config();
const express = require('express');
const routes = require('./Routes.js');

const app = express();

// --- Express Middleware ---
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// --- Express Routing ---
app.use('/', routes);

// --- Start application ---
app.listen(process.env.NODE_LISTEN_PORT,(error) => {
    if(error){
        throw `Error: ${error}`;
    }
    console.log(`Server listening on port ${process.env.NODE_LISTEN_PORT}\nWhisper binary: ${process.env.WHISPER_BINARY}\nWhisper Upload Dir: ${process.env.WHISPER_UPLOAD_DIR}\nTranscriptions output dir: ${process.env.TRANSCRIPTION_OUTPUT_DIR}`);
});