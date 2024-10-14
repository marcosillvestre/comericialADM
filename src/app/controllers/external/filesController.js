import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as Yup from 'yup';
import { StringsMethods } from "../../../config/serializerStrings.js";
import prisma from "../../../database/database.js";
import { r2 } from "../../lib/cloudFare/r2.js";

import 'dotenv';
import { Historic } from "../../../database/historic/properties.js";

const { spacesAndLowerCase } = new StringsMethods()
const { _store } = new Historic()

class FilesController {
    async store(req, res) {
        const { name, contentType, size, contrato, responsible } = req.body


        const schema = Yup.object({
            name: Yup.string().required(),
            contentType: Yup.string().required(),
            contrato: Yup.string().required()
        })


        const regex = /\w+\/[-+.\w]+/;


        if (!(await schema.validateSync(req.body, { abortEarly: false })) || !regex.test(contentType)) return res.status(400).json("Erro")


        const time = new Date().getTime()

        const fileName = spacesAndLowerCase(time + "-" + name).replace("+", "")
        try {
            const signedUrl = await getSignedUrl(
                r2,
                new PutObjectCommand({
                    Bucket: process.env.BUCKET_NAME,
                    Key: fileName,
                    ContentType: contentType,
                    ContentLength: size

                }),
                { expiresIn: 300 }
            );

            if (signedUrl) {

                await Promise.all([
                    prisma.files.create({
                        data: {
                            name,
                            contentType,
                            key: fileName,
                            contract: contrato
                        }
                    }),
                    _store(responsible, "Anexos", "Novo", contrato)
                ])



                return res.status(200).json(signedUrl)
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Error in create url" })
        }


    }

    async index(req, res) {
        const { contract } = req.query

        const files = await prisma.files.findMany({
            where: {
                contract
            },
            select: {
                id: true,
                name: true,
                key: true
            }
        })

        return res.status(200).json(files)
    }

    async downloadFiles(req, res) {
        const { key } = req.query


        const downloadUrl = await getSignedUrl(
            r2,
            new GetObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: key
            })
        )


        return res.status(200).json(downloadUrl)
    }


    async deleteFiles(req, res) {

        const { key, contract, responsible } = req.query


        try {
            const { id } = await prisma.files.findFirst({
                where: {
                    key,
                    contract
                }
            })


            if (!id) throw new Error("Not found")

            await prisma.files.delete({
                where: {
                    id
                }
            })

            const cmd = new DeleteObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: key,
            })


            await Promise.all([

                r2.send(cmd),
                _store(responsible, "Anexos", "Deletado", contract)

            ])

            return res.status(200).json({ message: "Deletado com sucesso" })

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Error in create url" })
        }

    }
}

export default new FilesController