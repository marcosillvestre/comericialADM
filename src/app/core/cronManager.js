import { CronJob } from "cron";
import token from "../connection/contaAzulDBSearch.js";
import searchSync from '../connection/engineSearch.js';




const functionsArray = [
    {
        time: "0 */30 * * * *",
        fn: searchSync
    },
    {
        time: "0 */57 * * * *",
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