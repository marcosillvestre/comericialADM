import { CronJob } from "cron";
import token from "../connection/contaAzulDBSearch.js";
import searchSync from '../connection/engineSearch.js';
import syncContaAzul from "../connection/syncCA&Db.js";



const functionsArray = [
    {
        time: "0 */30 * * * *",
        fn: searchSync
    },
    {
        time: "0 0 */3 * *",
        fn: syncContaAzul
    },

    {
        time: "*/53 * * * *",
        fn: token
    },
]

functionsArray.forEach(async res => {
    new CronJob(`${res.time}`,

        async function () {
            await res.fn();
        },
        null,
        true,
        'America/Los_Angeles'
    )
})