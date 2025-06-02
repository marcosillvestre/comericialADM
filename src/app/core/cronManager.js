import { CronJob } from "cron";


import chargingBillingRules from '../connection/billingRule.js';
// import syncContaAzulRegister from "../connection/contaAzul.js";
import { firstClassDaily, firstClassSearch } from '../connection/FirstClassSearch.js';
import orderBooks from "../connection/orderingBooks.js";
import NewSearchSync from "../connection/rdSearchSync.js";
import renewContracts from '../connection/searchEndContractsRd.js';
import SyncronizeSalesAndRegisters from '../connection/syncronizeCAandDatabase.js';


const functionsArray = [
    //everyday
    {
        time: "0 */60 * * * *",
        fn: NewSearchSync
    },
    {
        time: "0 */3 * * *",
        fn: SyncronizeSalesAndRegisters
    },
    {
        time: "0 2 * * *",
        fn: chargingBillingRules
    },
    {
        time: "0 4 * * *",
        fn: firstClassDaily
    },

    //atDay
    {
        time: "0 0 8 * * tue",
        fn: renewContracts
    },
    {
        time: "0 0 4 * * mon",
        fn: orderBooks
    },

    {
        time: "0 0 5 * * mon",
        fn: firstClassSearch
    },
]

functionsArray.forEach(res => {
    return new CronJob(res.time,
        function () {
            res.fn();
        },
        null,
        true,
        'America/Los_Angeles'
    )
})



