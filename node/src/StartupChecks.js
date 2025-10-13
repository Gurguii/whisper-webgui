async function checkWhisperService()
{
    // 1. Check that all whisper services are accesible.
    const models = ["tiny", "base", "small", "medium", "large", "turbo"];

    for(const model of models)
    {
        try{
            const response = await fetch(`http://gwhisp-worker-${model}:8080`);
            console.log(`: Whisper worker ${model} OK`);

            if(response.ok && response.status === 200){
                continue
            }

        }catch(error){
            // TODO - Check if its just not reachable or a major problem, 
            // if not reachable, return something like {type: "warning", msg: "missing worker"}
            // and change return values to receive such object and behave depending on what the problem is, not just
            // quit the whole app if a single model or two are not reachable (also allows not necessarily having all models up)
            console.log(`Caught an error with gwhisp-worker-${model} - ${error}`);
            return false;
        }
    }

    return true;
}

async function initialChecks()
{
    return await checkWhisperService();
}

export default initialChecks;