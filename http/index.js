const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('audioVideoFile');
const form = document.getElementById('transcribeForm');

/* BEG - Drag and drop */
['dragenter', 'dragover', 'dragleave', 'drop', 'mouseover', 'mouseleave'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
});

function preventDefaults (e) {
    e.preventDefault()
    e.stopPropagation()
}

['dragenter', 'dragover', 'mouseover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false)
});

['dragleave', 'drop', 'mouseleave'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false)
});

function highlight(e) {
    dropArea.classList.add('highlight-drop-area')
}

function unhighlight(e) {
    dropArea.classList.remove('highlight-drop-area')
}

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false)
function handleDrop(e) {
    const dt = e.dataTransfer
    const files = dt.files
    fileInput.files = files; // Assign the dropped files to the file input
    // You can optionally display the names of the dropped files
    if (files.length > 0) {
        console.log('Selected files:', files);
        // Optionally update the label or display file names
        const fileNames = Array.from(files).map(file => file.name).join(', ');
        dropArea.querySelector('p').innerHTML = `<b>Selected files: ${fileNames}</b>`;
    }
}

// Make the drop area clickable to open the file dialog
dropArea.addEventListener('click', () => {
    fileInput.click();
});

// Update drop area text when files are selected via the file input
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        const fileNames = Array.from(fileInput.files).map(file => file.name).join(', ');
        dropArea.querySelector('p').innerHTML = `<b>Selected files: ${fileNames}</b>`;
    } else {
        dropArea.querySelector('p').innerHTML = '<b>Drag and drop or click to select</b>';
    }
});
/* END - Drag and drop */

function changeExt(filePath, newext){
  const pos = filePath.lastIndexOf(".");
  const filepath = filePath.substr(0, pos < 0 ? filePath.length : pos) + "." + newext;
  return filepath;
}

document.getElementById('transcribeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Empty the status elements, removing previous download buttons
    document.getElementById('status').innerHTML = "";

    const formData = new FormData(event.target);
    const files = formData.getAll('audioVideoFile');

    // Create a paragraph with a download href for each file
    document.getElementById('status').innerHTML = "";
    
    files.forEach(file => {
        document.getElementById('status').innerHTML += `<div class='statusOfFile' id='${file.name}_div'><p id='${file.name}_p'>${file.name} <b id='${file.name}_status'>processing</b></p></div>`;      
    })

    /* BEG - request to backend to start transcribing */ 
await fetch('http://localhost:3000/whizard', {
        method: 'POST',
        body: formData,
    }).then(async response => {
        if(response.status === 202)
        {
            const data = await response.json();
            
            // Assuming the 202 response includes a jobId:
            const jobId = data.jobId; 

            // --- REPLACED POLLING LOGIC WITH WEBSOCKET ---
            const websocketUrl = `ws://localhost:3333/${jobId}`; 
            
            const ws = new WebSocket(websocketUrl);
            
            ws.onopen = () => {
                ws.send(JSON.stringify({job: jobId, hola: "asdas"}));
            }
            
            // Handler for receiving status updates from the server
            ws.onmessage = (event) => {
                try {
                    // The server pushes a JSON object (statusData) when a file status changes
                    const statusData = JSON.parse(event.data); 
                    
                    console.log('Received WebSocket update:', statusData);
                    
                    const { status, originalFileName, downloadUrl, jobStatus} = statusData;
                    const statusElement = document.getElementById(`${originalFileName}_status`);
                    const divElement = document.getElementById(`${originalFileName}_div`);

                    if(status === "done"){
                        statusElement.innerHTML = `<a class='download-link' href=${downloadUrl}>completed<br>`;
                        statusElement.querySelector('.download-link').addEventListener('click', function(e){
                            divElement.style.display = 'none';
                        })
                    }else if(status === "failed"){
                        statusElement.innerHTML += `Transcription failed for ${originalFileName} ${error || 'unknown error'}`;
                    }
                    
                    // If the server indicates the entire job is finished, close the connection
                    // (Requires the server to send a final 'jobComplete' flag)
                    if (jobStatus === "done") {
                        ws.close();
                        console.log('Job completed. WebSocket connection closed.');
                    }
                    
                } catch (e) {
                    console.error('Error processing WebSocket message:', e);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
            };

            ws.onclose = () => {
                console.log('WebSocket connection closed.');
            };

            // --- END WEBSOCKET LOGIC ---

        } else {
            // Handle non-202 responses
        }
    }).catch(err => {
        console.log("Got an error", err);
    });
    /* END - request to backend to start transcribing */
});