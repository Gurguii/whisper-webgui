import os from 'os';
import fs from 'fs';
import FormData from 'form-data';
import { randomUUID } from 'crypto'
import axios from 'axios';
import path from 'path';
import uniqueFilename from 'unique-filename';
import * as wsmanager from './WebSocketManager.js';
import mongoColl from './MongoDb.js'
import  { Binary } from 'mongodb';

export let fileStatus = new Map();

const tmpDir = os.tmpdir();

export async function transcribeAndtranslate(req, res)
{
    const jobId = randomUUID();

    let statusList = {};

    let filesToProcess = req.files.length;
    var uniqueNames = new Map();

    req.files.forEach(async file => {
        const randomTmpFile = uniqueFilename(tmpDir);
        const uniqueFileName = path.basename(randomTmpFile);
        uniqueNames[uniqueFileName] = file.originalname;

        uniqueNames.forEach((key,val) => {
            console.log(`Key: ${key} Val: ${val}`)
        })

        var fileExtension = "";
        

        const model = req.body.model;
        
        if(req.body.outputType === "txt"){
            fileExtension = ".txt";
        }else if(req.body.outputType === "vtt"){
            fileExtension = ".vtt";
        }else if(req.body.outputType === "srt"){
            fileExtension = ".srt";
        }else{
            fileExtension = ".json";
        }

        const randomTmpFileBasenameExt = uniqueFileName + fileExtension;

        statusList[randomTmpFileBasenameExt] = {status: "pending", originalFileName: file.originalname};

        var form = new FormData();

        // 1. Append the file with its stream and metadata
        // Pass a valid stream/buffer as the first argument to append
        form.append("file", file.buffer, { 
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size 
        })

        // 2. Append the other fields
        // This is basicly sending the options to the server
        form.append("response_format", req.body.outputType);
        form.append("no_context", "true");
        form.append("translate", req.body.actionType === "translate" ? "true" : "false");
        form.append("language", req.body.language);
        form.append("prompt", req.body.initial_prompt)
        form.append("split_on_word", req.body.split_on_word)
        
        // 3. Send the request asynchronously to whisper-server using axios
        axios.post(`http://gwhisp-worker-${model}:8080/inference`, form, {
                headers: form.getHeaders(),
                responseType: 'arraybuffer'
            }
        )
        .then(function (response) {
            if(response.status === 200 && response.statusText === "OK")
            {
                // Write data to file and update fileStatus
                const randomTmpFilePath = path.join(randomTmpFile + fileExtension);

                // NEW - write data to mongodb server.
                (async () => {
                    try{
                        await mongoColl.insertOne({id: uniqueFileName, data: response.data, extension: fileExtension});
                        // TODO - check insertOne return value (true|false) and act appropiately
                    }catch(err){
                        console.log(`Caught an error inserting document - ${err}`);
                    }
                })();
                
                --filesToProcess;

                wsmanager.activeConnections[jobId].send(JSON.stringify(
                    {
                        status: "done",
                        uniqueFileName: uniqueFileName,
                        originalFileName: file.originalname,
                        downloadUrl: `/api/download/${uniqueFileName}`,
                        jobStatus: `${filesToProcess === 0 ? "done" : "ongoing"}`
                    }
                ));

                fileStatus[jobId][randomTmpFileBasenameExt] = {
                    status: "done",
                    originalFileName: file.originalname,
                    downloadUrl: `/api/download/${uniqueFileName}`
                }

                if(filesToProcess === 0){
                    wsmanager.unregisterConnection(jobId);
                }
            }        
        }).catch(function (error) {
            console.log("Caught error");

            if (error.response) {
               // The request was made and the server responded with a status code 
               // that falls out of the range of 2xx
               console.error(`Axios Error: ${error.response.status} - ${error.response.statusText}`);
               console.error("Server Response Data:",
                 error.response.data);
            } else {
                console.error("Network or other error:",
                     error.message);
            }               
        });
    });

    fileStatus[jobId] = statusList;

    // Advice the client we are processing the files and where to check the status.
    res.status(202).json({jobId: jobId, filesToProcess: Object.keys(statusList).length, uniqueNames: uniqueNames});
};

// /download-test/:file
export async function downloadFile(req, res){
    console.log(`File to retrieve: ${req.params.file}`);

    if(!req.params.file){
        res.status(400).json({});
        return;
    }

    const { data, extension } = await mongoColl.findOne({id: req.params.file});

    if (!data) {
        res.status(404).json({msg: `File ${req.params.file} not found or has no content`});
        return;
    }

    let buff;
 
    if (data instanceof Binary) {
        buff = data.buffer; 
    } else if (typeof data === 'string') {
        buff = Buffer.from(data, 'base64');
    } else {
        console.error('Data retrieved is neither a BSON Binary object nor a string.');
        res.status(500).json({msg: 'Unexpected data type in database.'});
        return;
    }
    
    if (buff && !(buff instanceof Buffer)) {
        buff = Buffer.from(buff);
    }

    if (buff.length === 0) {
        res.status(400).json({msg: `File ${req.params.file} has empty or invalid content.`});
        return;
    }

    const filename = `${req.params.file}${extension}`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buff.length);

    res.status(200).send(buff);

    console.log(`Removing ${filename} from database`);

    if(await mongoColl.deleteOne({id: req.params.file})){
        console.log(`Doc for ${req.params.file} removed`);
    }else{
        console.log(`Couldn't remove doc for ${req.params.file}`);
    }
}