import 'dotenv/config'

export default (req, res, next) => {
    const authToken = req.headers.authorization
    if (!authToken) {
        return res.status(401).json({ error: 'token not provided or expired' })
    }

    const token = authToken.split(" ")[1]


    try {

        if (token !== process.env.WEBHOOKS_TOKEN) {
            throw new Error()
        }


        return next()
    } catch (error) {
        return res.status(401).json({ error: "token invalid" })
    }
}