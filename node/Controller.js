const os = require('node:os');
const fs = require('node:fs');
const FormData = require('form-data');

const { randomUUID } = require('node:crypto');
const axios = require('axios');
const path = require('node:path');
const uniqueFilename = require('unique-filename')


let fileStatus = {

};

const tmpDir = os.tmpdir();

async function transcribeAndtranslate(req, res)
{
    const jobId = randomUUID();

    let statusList = {};

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

                fileStatus[jobId][randomTmpFileBasenameExt] = {status: "done", originalFileName: file.originalname, downloadUrl: `http://localhost:3000/download/${randomTmpFileBasenameExt}`}
            }        
        }).catch(function (error) {
            if (error.response) {
               // The request was made and the server responded with a status code 
               // that falls out of the range of 2xx
               console.error(`Axios Error: ${error.response.status} - ${error.response.statusText}`);
               console.error("Server Response Data:", error.response.data);
            } else {
                console.error("Network or other error:", error.message);
            }               
        });
    });

    fileStatus[jobId] = statusList;

    console.log(statusList);
    console.log(fileStatus);

    // Advice the client we are processing the files and where to check the status.
    res.status(202).json({statusCheckUrl: `http://localhost:3000/status/${jobId}`, filesToProcess: Object.keys(statusList).length});
};

function getJobStatus(req, res)
{
    console.log(`[${req.method}] from ${req.ip} ${req.get('host')}/${req.originalUrl} ${req.params.jobid}`);

    if(fileStatus[req.params.jobid]){
        res.status(200).json(fileStatus[req.params.jobid]);
        return;
    }

    res.status(404).json({status: "error", message: "Job not found or has expired"});
}

async function downloadFile(req, res) {
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

module.exports =
{
    transcribeAndtranslate,
    getJobStatus,
    downloadFile
}