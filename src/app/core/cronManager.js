import { CronJob } from "cron";


import syncContaAzulRegister from "../connection/contaAzul.js";
import { firstClassDaily, firstClassSearch } from '../connection/FirstClassSearch.js';
import orderBooks from "../connection/orderingBooks.js";
import NewSearchSync from "../connection/rdSearchSync.js";
import renewContracts from '../connection/searchEndContractsRd.js';

const functionsArray = [

    {
        time: "0 */60 * * * *",
        fn: NewSearchSync
    },
    {
        time: "0 0 8 * * tue",
        fn: renewContracts
    },
    {
        time: "0 0 4 * * mon",
        fn: orderBooks
    },
    {
        time: "0 */3 * * *",
        fn: syncContaAzulRegister
    },
    {
        time: "0 0 5 * * mon",
        fn: firstClassSearch
    },
    {
        time: "0 12 * * *",
        fn: firstClassDaily
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



