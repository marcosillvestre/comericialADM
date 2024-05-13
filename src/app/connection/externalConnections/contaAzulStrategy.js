import 'dotenv/config';
import passport from "passport";
import { Strategy as ContaAzulStrategy } from "passport-oauth2";

passport.use(new ContaAzulStrategy(
    {
        authorizationURL: 'https://api.contaazul.com/auth/authorize',
        tokenURL: 'https://api.contaazul.com/oauth2/token',
        clientID: process.env.CONTA_AZUL_CLIENT_ID,
        clientSecret: process.env.CONTA_AZUL_CLIENT_SECRET,
        callbackURL: "http://localhost:7070/redi",
        scope: ['sales'],
    },
    async (accessToken, refreshToken, profile, done) => {
        console.log({ token: accessToken, refreshToken: refreshToken })

        done(null, { token: accessToken, refreshToken: refreshToken })
    }))


