import {MongoClient} from 'mongodb';

const DB_NAME = "gwhisp";
const COLLECTION_NAME = "transcriptions";

const client = new MongoClient("mongodb://gwhisp-database:27017");
let db;
let collection;

try{
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
}catch(err){
    console.log(`Caught an error when setting mongodb client - ${err}`)
}

export default collection;