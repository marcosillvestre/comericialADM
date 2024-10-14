import { S3Client } from "@aws-sdk/client-s3";


export const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFARE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFARE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFARE_SECRET_KEY
    }
})

