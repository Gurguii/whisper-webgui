const { execFile } = require('node:child_process')
const path  = require('node:path')
const { Readable } = require('node:stream');
var FormData = require('form-data');
const axios = require('axios');

let fileStatus = {

};

async function transcribeAndtranslate(req, res)
{
    req.files.forEach(async file => {
    
        var form = new FormData();
        const fileStream = Readable.from(file.buffer);

        // 1. Append the file with its stream and metadata
        // Pass a valid stream/buffer as the first argument to append
        form.append("file", fileStream, { 
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size 
        })

        // 2. Append the other fields (use form.append for all)
        form.append("response-format", "json");
        form.append("no_context", "true");
        form.append("translate", req.body.actionType === "translate" ? "true" : "false");
        form.append("language", req.body.language);

        // 3. Send the request using axios
        try {
            const response = await axios.post("http://localhost:8080/inference", form, {
                // Axios uses the spread operator for headers, which is often cleaner
                headers: form.getHeaders() 
            });

            if(response.status === 200 && response.statusText === "OK")
            {
                console.log(response.data);
            }
            // TODO - add requests to fileStatus and leave the axios.post as async.

            //console.log(`${response.status} - ${response.statusText}`);
            //console.log(response);
            // Handle the response
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code 
                // that falls out of the range of 2xx
                console.error(`Axios Error: ${error.response.status} - ${error.response.statusText}`);
                console.error("Server Response Data:", error.response.data);
            } else {
                console.error("Network or other error:", error.message);
            }
        }
    });  
};

function getJobStatus(req, res)
{

    console.log(`Requested status for filename ${req.params.filename}`);

    if(fileStatus[req.params.filename]){
        res.status(200).json(fileStatus[req.params.filename]);
        return;
    }

    res.status(404).json({status: "error", message: "Job not found or has expired"});
}

module.exports =
{
    transcribeAndtranslate,
    getJobStatus
}