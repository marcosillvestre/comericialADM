import { CronJob } from "cron";


import syncContaAzul from "../connection/contaAzulSyncDatabase.js";
import searchSync from '../connection/engineSearch.js';
import renewContracts from '../connection/searchEndContractsRd.js';

const functionsArray = [
    {
        time: "0 */60 * * * *",
        fn: searchSync
    },
    {
        time: "0 */2 * * *",
        fn: syncContaAzul
    },
    {
        time: "0 12 1 * *",
        fn: renewContracts
    },
]



functionsArray.map(res => {
    return new CronJob(`${res.time}`,
        function () {
            res.fn()
        },
        null,
        true,
        'America/Los_Angeles'
    )
})



