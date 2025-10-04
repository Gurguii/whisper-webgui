import os from 'os';
import fs from 'fs';
import FormData from 'form-data';
import { randomUUID } from 'crypto'
import axios from 'axios';
import path from 'path';
import uniqueFilename from 'unique-filename';
import * as wsmanager from './WebSocketManager.js';

export let fileStatus = new Map();

const tmpDir = os.tmpdir();

export async function transcribeAndtranslate(req, res)
{
    const jobId = randomUUID();

    let statusList = {};

    let filesToProcess = req.files.length;

    req.files.forEach(async file => {
        const randomTmpFile = uniqueFilename(tmpDir);
            
        var fileExtension = "";

        if(req.body.outputType === "txt"){
            fileExtension = ".txt";
        }else if(req.body.outputType === "vtt"){
            fileExtension = ".vtt";
        }else if(req.body.outputType === "srt"){
            fileExtension = ".srt";
        }else{
            fileExtension = ".json";
        }

        const randomTmpFileBasenameExt = path.basename(randomTmpFile) + fileExtension;

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
        form.append("response_format", req.body.outputType);
        form.append("no_context", "true");
        form.append("translate", req.body.actionType === "translate" ? "true" : "false");
        form.append("language", req.body.language);

        // 3. Send the request asynchronously to whisper-server using axios
        axios.post("http://localhost:8080/inference", form, {
                headers: form.getHeaders(),
                responseType: 'arraybuffer'
            }
        )
        .then(function (response) {
            if(response.status === 200 && response.statusText === "OK")
            {
                // Write data to file and update fileStatus
                const randomTmpFilePath = path.join(randomTmpFile + fileExtension);

                fs.writeFileSync(randomTmpFilePath, response.data, (err) => {
                    if(err){
                        console.log(`There was an error writing the response data to file ${randomTmpFilePath} - ${err}`)
                    }
                    else{
                        console.log(`File ${randomTmpFile} succesfully written to disk, updating status...`)
                    }
                });
                
                --filesToProcess;

                wsmanager.activeConnections[jobId].send(JSON.stringify(
                    {
                        status: "done",
                        originalFileName: file.originalname,
                        downloadUrl: `http://localhost:3000/download/${randomTmpFileBasenameExt}`,
                        jobStatus: `${filesToProcess === 0 ? "done" : "ongoing"}`
                    }
                ));

                fileStatus[jobId][randomTmpFileBasenameExt] = {
                    status: "done",
                    originalFileName: file.originalname,
                    downloadUrl: `http://localhost:3000/download/${randomTmpFileBasenameExt}`
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
    res.status(202).json({jobId: jobId, filesToProcess: Object.keys(statusList).length});
};

export async function downloadFile(req, res) {
    const filePath = path.join(tmpDir, req.params.file); 
    
    console.log("Preparing to download and remove:", filePath);

    // 1. Pass the callback function as the second argument to res.download()
    res.download(filePath, (err) => {
        if (err) {
            // Handle errors during the download process
            console.log("Download attempt error:", err);
            
            // Check for File Not Found (ENOENT)
            if (err.code === "ENOENT") {
                console.log(`File ${filePath} not found`);
                // Ensure a response is sent if the file is missing
                // Check if headers have already been sent before responding
                if (!res.headersSent) {
                    return res.status(404).json({ status: "error", message: "File not found" });
                }
            } else {
                // Handle other download errors (permissions, etc.)
                console.log("Other download error:", err);
                // Only send a 500 status if no headers have been sent yet
                if (!res.headersSent) {
                    return res.status(500).json({ status: "error", message: "Could not complete download" });
                }
            }
        } else {
            // 2. The download was successful (file streamed to the client).
            console.log("Client successfully downloaded the file:", filePath);
            
            // 3. Delete the file after a successful download.
            // Using the synchronous fs.unlinkSync is acceptable here 
            // since this logic runs AFTER the download is complete.
            try {
                fs.unlinkSync(filePath);
                
                console.log("Successfully removed file:", filePath);

                if(fileStatus[req.params.file]){
                    delete fileStatus[req.params.file];
                    console.log("Succesfully deleted file entry from fileStatus dictionary")
                }

            } catch (unlinkErr) {
                console.log("Error removing file:", unlinkErr);
            }
        }
    });
}