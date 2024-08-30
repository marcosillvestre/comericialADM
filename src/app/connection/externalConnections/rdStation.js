import axios from 'axios';
import "dotenv/config";
import { SendRematriculaToTrello } from './trello.js';


const stageToBeUpdated = {
    "Centro": "64badc42874ccc000dd4ed37",
    "PTB": "64bacb30693f48000d57686d",

    "backCentro": "64badc42874ccc000dd4ed34",
    "backPTB": "64bacb30693f48000d57686a",

    "winCentro": "64badc42874ccc000dd4ed38",
    "loseCentro": "64badc42874ccc000dd4ed35",

    "winPTB": "64bacb30693f48000d57686e",
    "losePTB": "64bacb30693f48000d57686b",
}

async function updateStageRd(data, unity) {


    await axios.put(`https://crm.rdstation.com/api/v1/deals/${data.id}?token=${process.env.RD_TOKEN}`,
        { deal_stage_id: stageToBeUpdated[unity] })
        .then(async (res) => {
            if (unity.includes("back") || unity.includes("win") || unity.includes("lose")) return
            await SendRematriculaToTrello(res.data, unity)
        })
        .catch((err) => console.log("rd, ", { name: err.response.data.name, errors: err.response.data.errors }))
}


export default updateStageRd