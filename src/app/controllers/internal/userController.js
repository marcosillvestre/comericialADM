
import bcrypt from 'bcrypt';
import * as yup from 'yup';
import prisma from '../../../database/database.js';

class UserController {
    async store(req, res) {

        const schema = yup.object().shape({
            name: yup.string().required(),
            email: yup.string().email().required("Insira um email válido!"),
            password: yup.string().required("A senha deve conter no mínimo 6 dígitos!").min(6),
            role: yup.string().required(),
            unity: yup.array().required(),
            admin: yup.boolean(),
            responsible: yup.string().required(),
        })
        try {

            await schema.validateSync(req.body, { abortEarly: false })

            const { name, email, password, admin, role, unity, responsible } = req.body

            const permissionTest = await prisma.login.findFirst({
                where: {
                    name: {
                        contains: responsible,
                        mode: "insensitive"
                    }
                }
            })

            if (permissionTest.role !== 'direcao') return res.status(403).json({ message: "Sem permissão para criar novos usuários" })



            const userExists = await prisma.login.findMany({ where: { email } })
            if (userExists.length > 0) return res.status(401).json({ message: "Já existe um usuário utilizando esse email, utilize outro email ou troque a senha para ter acesso!" })

            const password_hash = await bcrypt.hash(password, 10)

            const newUser = await prisma.login.create({
                data: {
                    name,
                    role,
                    admin,
                    unity,
                    "email": email.toLowerCase(),
                    "password": password_hash,
                }
            })

            return res.status(201).json(newUser)

        } catch (error) {
            console.log({
                where: "[USER.CREATE]",
                error
            })
            return res.status(401).json({ message: "Erro ao criar novo usuário, confira seus dados!" })
        }



    }

    async index(req, res) {
        const schema = yup.object().shape({

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, orderFor } = req.body

            const [users, total] = await prisma.$transaction([
                prisma.login.findMany({
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    },
                }),
                prisma.login.count()

            ])

            return res.status(200).json({
                users,
                total
            })

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    async update(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required(),
            email: yup.string().email().required(),
            password: yup.string().required().min(6),
            role: yup.string().required(),
            unity: yup.array().required(),
            admin: yup.boolean(),
        })

        try {


            await schema.validateSync(req.body, { abortEarly: false })
            const { id, name, email, admin, role, unity, responsible } = req.body

            const permissionTest = await prisma.login.findFirst({
                where: {
                    name: {
                        contains: responsible,
                        mode: "insensitive"
                    }
                }
            })

            if (permissionTest.role !== 'direcao') return res.status(400).json({ message: "Sem permissão" })


            const newUser = await prisma.login.update({
                where: {
                    id
                },
                data: {
                    name, email, admin, role, unity,
                }
            })


            return res.status(200).json(newUser)

        } catch (err) {
            console.log(err)
            return res.status(400).json({ message: err.errors })
        }
    }

    async delete(req, res) {

        const schema = yup.object().shape({
            id: yup.string().required(),
        })

        try {


            await schema.validateSync(req.params, { abortEarly: false })

            const { id } = req.params
            const { responsible } = req.query

            const int = parseInt(id)


            const permissionTest = await prisma.login.findFirst({
                where: {
                    name: {
                        contains: responsible,
                        mode: "insensitive"
                    }
                }
            })
            if (permissionTest.role !== 'direcao') return res.status(400).json({ message: "Sem permissão" })


            if (int) {
                const deletedUser = await prisma.login.delete({ where: { id: int } })
                return res.status(204).json({ message: "success" });
            }

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "falta algo" })
        }
    }


}

export default new UserController()