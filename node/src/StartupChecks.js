async function checkWhisperService()
{
    // 1. Check that whisper service is accesible.
    try{
        const response = await fetch("http://gwhisp-worker:8080");
        console.log(response);
        
        if(response.ok && response.status === 200){
            return true;
        }
        
    }catch(error){
        console.log(`Caught an error - ${error}`);
        return false;
    }
}

async function initialChecks()
{
    return await checkWhisperService();
}

export default initialChecks;