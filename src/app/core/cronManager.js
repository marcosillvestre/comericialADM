import { CronJob } from "cron";
import token from '../connection/contaAzulDBSearch.js';
import syncContaAzul from "../connection/contaAzulSyncDatabase.js";
import searchSync from '../connection/engineSearch.js';
import renewContracts from '../connection/searchEndContractsRd.js';

const functionsArray = [
    {
        time: "0 */30 * * * *",
        fn: searchSync
    },
    {
        time: "0 13 * * *",
        fn: syncContaAzul
    },
    {
        time: "0 12 1 * *",
        fn: renewContracts
    },
    {
        time: "0 */40 * * * *",
        fn: token
    },
    {
        time: "0 */40 * * * *",
        fn: token
    }
]

functionsArray.forEach(async res => {
    await new CronJob(`${res.time}`,

        async function () {
            await res.fn();
        },
        null,
        true,
        'America/Los_Angeles'
    )
})



