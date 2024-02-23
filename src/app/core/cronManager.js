import { CronJob } from "cron";
import token from "../connection/contaAzulDBSearch.js";
import searchSync from '../connection/engineSearch.js';

const job = new CronJob('0 */50 * * * *',
    function () {
        let data = [
            searchSync(200),
            token()
        ]
        data.forEach(res => res)
    },
    null,
    true,
    'America/Los_Angeles'
)


