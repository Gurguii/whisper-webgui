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
        document.getElementById('status').innerHTML += `<div class='statusOfFile' id='${file.name}_div'><p id='${file.name}_p'>${file.name} <b id='${file.name}_status'></b></p></div>`;      
    })

    /* BEG - request to backend to start transcribing */ 
    await fetch('http://localhost:3000/whizard', {
        method: 'POST',
        body: formData,
    }).then(async response => {
        if(response.status === 202)
        {
            const data = await response.json();
            
            const status = data.status;
            let receivedRequests = data.filesToProcess;

            const statusCheck = data.statusCheckUrl;

            var completedFiles = {};

            const intervalId = setInterval(async () => {
                try {
                    console.log("Polling");

                    const statusResponse = await fetch(statusCheck);
                    const statusData = await statusResponse.json();

                    console.log(statusData);

                    for(const [file,props] of Object.entries(statusData)){
                        const statusElement = document.getElementById(`${props.originalFileName}_status`);
                        const divElement = document.getElementById(`${props.originalFileName}_div`);

                        if(props.status === "done" && ! (file in completedFiles)){
                            statusElement.innerHTML = `<a class='download-link' href=${props.downloadUrl}>completed<br>`;
                            statusElement.querySelector('.download-link').addEventListener('click', function(e){
                                divElement.style.display = 'none';
                            })

                            completedFiles[file] = "";
                            --receivedRequests;
                        }else if(props.status === "pending"){
                            statusElement.innerHTML = `<b>pending</b>`;
                        }else if(props.status === "failed"){
                            statusElement.innerHTML += `Transcription failed for ${props.originalFileName} ${statusData.error}`;
                            --receivedRequests;
                        }
                    }

                    console.log(`Received requests: ${receivedRequests}`);

                    if(receivedRequests === 0){
                        // All requests have been processed, stop the polling
                        clearInterval(intervalId);
                    };

                } catch (error) {
                console.error('Error polling status:', error);
            }
            }, 3000); // Poll every 3 seconds
        }
    }).catch(err => {
        console.log("Got an error", err);
    });
    /* END - request to backend to start transcribing */
});