import prisma from '../../../database/database.js';

class InsumeController {

    async index(req, res) {
        try {
            const Insumes = await prisma.insume.findMany();
            res.status(200).json(Insumes);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch Insumes' });
        }
    }

    async store(req, res) {
        const { name, sku, price_selling, color } = req.body;

        try {


            const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
            const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
            const descreaseThird = Math.floor(increseTax - increseTax * 0.3)


            const newInsume = await prisma.insume.create({
                data: {
                    name,
                    sku,
                    price_selling,
                    color,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                },
            });
            res.status(201).json(newInsume);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const { name, sku, price_selling, price_ticket, price_card, price_cash, color } = req.body;

        try {
            const updatedInsume = await prisma.insume.update({
                where: { id: id },
                data: {
                    name,
                    sku,
                    price_selling,
                    price_ticket,
                    price_card,
                    price_cash,
                    color,
                },
            });
            res.status(200).json(updatedInsume);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {
            await prisma.insume.delete({
                where: { id: Number(id) },
            });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new InsumeController();
