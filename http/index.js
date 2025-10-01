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
        console.log('Archivos arrastrados:', files);
        // Optionally update the label or display file names
        const fileNames = Array.from(files).map(file => file.name).join(', ');
        dropArea.querySelector('p').innerHTML = `<b>Archivos seleccionados: ${fileNames}</b>`;
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
        dropArea.querySelector('p').innerHTML = `<b>Archivos seleccionados: ${fileNames}</b>`;
    } else {
        dropArea.querySelector('p').innerHTML = '<b>Arrastra y suelta tus archivos aquí o haz clic para seleccionar</b>';
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

    const formData = new FormData(event.target);
    const filename = formData.getAll('audioVideoFile');

    console.log(`Filenames for polling -> ${filename}`);

    document.getElementById('status').innerHTML = 'Transcription in progress...';

    /* BEG - Async request to backend to start transcribing */ 
    try {
        console.log("hehehe");

        const response = await fetch('http://localhost:3000/whizard', {
            method: 'POST',
            body: formData,
        });

        console.log("hahaha");
        if (response.status === 202) {
            // Start polling
            const intervalId = setInterval(async () => {
                try {
                    console.log("Polling");
                    //console.log("interval");
                    const statusResponse = await fetch(`/api/transcription-status/${filename}`);
                    const statusData = await statusResponse.json();

                    if (statusData.status === 'completed') {
                        clearInterval(intervalId);
                        document.getElementById('status').innerHTML = `<a href="/api/download/${filename}.gz">Download Transcription</a>`;
                    } else if (statusData.status === 'failed') {
                        clearInterval(intervalId);
                        document.getElementById('status').innerHTML = `Transcription failed: ${statusData.error}`;
                    }
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            }, 3000); // Poll every 3 seconds
        } else {
            document.getElementById('status').innerHTML = 'Error starting transcription.';
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        document.getElementById('status').innerHTML = 'Error submitting form.';
    }
    /* END - Async request to backend to start transcribing */
});