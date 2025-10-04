export const activeConnections = new Map();

export function registerConnection(ws, jobid){
    console.log(`Registering connection with job ${jobid}`);
    activeConnections[jobid] = ws;
}

export function unregisterConnection(jobid){
    if(jobid in activeConnections){
        console.log(`Deleting connection with job ${jobid}`);
        delete activeConnections[jobid];
    }
}