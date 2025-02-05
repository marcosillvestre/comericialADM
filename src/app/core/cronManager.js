import { CronJob } from "cron";


import searchSync from '../connection/engineSearch.js';

const functionsArray = [
    {
        time: "0 */60 * * * *",
        fn: searchSync
    },
    // {
    //     time: "0 0 8 * * tue",
    //     fn: renewContracts
    // },
    // {
    //     time: "0 0 4 * * mon",
    //     fn: orderBooks
    // },
    // {
    //     time: "0 0 5 * * mon",
    //     fn: firstClassSearch
    // },
    // {
    //     time: "0 */3 * * *",
    //     fn: syncContaAzul
    // },

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



