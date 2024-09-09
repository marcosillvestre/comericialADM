import { CronJob } from "cron";


import syncContaAzul from "../connection/contaAzulSyncDatabase.js";
import searchSync from '../connection/engineSearch.js';
import orderBooks from "../connection/orderingBooks.js";
import renewContracts from '../connection/searchEndContractsRd.js';

const functionsArray = [
    {
        time: "0 */60 * * * *",
        fn: searchSync
    },
    {
        time: "* 16 * * 1",
        fn: renewContracts
    },
    {
        time: "0 8 * * 1",
        fn: orderBooks
    },
    {
        time: "0 */2 * * *",
        fn: syncContaAzul
    },

]



functionsArray.forEach(res => {
    return new CronJob(res.time,
        function () {
            res.fn()
        },
        null,
        true,
        'America/Los_Angeles'
    )
})



