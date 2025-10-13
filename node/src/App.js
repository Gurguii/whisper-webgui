import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import routes from './Routes.js'
import cors from 'cors';
import initialChecks from './StartupChecks.js';
import './WebSocketServerSetup.js'

const app = express();

// --- Express Middleware ---
app.use(cors());

app.use(express.urlencoded({extended: true}));

// --- Express Routing ---
app.use('/', routes);

// --- Start application ---
if(await initialChecks() == true){
    app.listen(process.env.NODE_LISTEN_PORT,(error) => {
        if(error){
            throw `Error: ${error}`;
        }
        console.log(`Server listening on port ${process.env.NODE_LISTEN_PORT}`);
    });
}else{
    console.log("Inital checks failed, not starting the app");
}