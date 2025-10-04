import { WebSocketServer } from 'ws';
import * as wsmanager from './WebSocketManager.js'
import { fileStatus } from './Controller.js'

function heartbeat(){
    this.isAlive = true;
}

const wss = new WebSocketServer(
    {
        port: 3333
    }
)

wss.on('connection', (ws, req) => {
    console.log(`Received a new socket connection with url ${req.url}`);
    const urlPaths = req.url.split('/');
    const job = urlPaths[1];
    
    if(job in fileStatus){
        console.log(`Job ${job} is in the list, registering it`);
        wsmanager.registerConnection(ws, job);
    }else{
       ws.close();
    }

    ws.isAlive = true;
    ws.on('error', console.error);
    ws.on('pong', heartbeat);
    ws.on('close', () => {
        console.log("Client closed connection");
    });
});

const interval = setInterval(function ping() {
    wss.clients.forEach(ws => {
        if(ws.isAlive === false){
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    })
}, 30000)

wss.on('close', () => {
    clearInterval(interval);
})