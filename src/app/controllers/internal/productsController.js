import prisma from '../../../database/database.js';

class ProductsController {

    async index(req, res) {
        const { take, skip } = req.query

        try {
            const Products = await prisma.products.findMany({
                take,
                skip
            });
            res.status(200).json(Products);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }

    async getEspecificData(req, res) {
        const { skus } = req.body

        try {
            const Products = await prisma.products.findMany();
            res.status(200).json(Products);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }

    async store(req, res) {
        const { name, sku, price_selling, color } = req.body;

        try {


            const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
            const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
            const descreaseThird = Math.floor(increseTax - increseTax * 0.3)
            const decreaseFifteen = Math.floor(increseTax - increseTax * 0.15)


            const newInsume = await prisma.products.create({
                data: {
                    name,
                    sku,
                    price_selling,
                    color,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                    price_link: decreaseFifteen,
                    category: "Product"
                },
            });
            res.status(201).json(newInsume);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const { name, sku, price_selling, color } = req.body;

        const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
        const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
        const descreaseThird = Math.floor(increseTax - increseTax * 0.3)
        const decreaseFifteen = Math.floor(increseTax - increseTax * 0.15)

        try {
            const updatedInsume = await prisma.products.update({
                where: { id: id },
                data: {
                    name,
                    sku,
                    price_selling,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                    price_link: decreaseFifteen,
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
            await prisma.products.delete({
                where: { id },
            });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new ProductsController();



// await prisma.insume.findMany()
//     .then(res => {

// res.map(async t => {
//     const { name, sku, price_selling, color, category } = t

//     const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
//     const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
//     const descreaseThird = Math.floor(increseTax - increseTax * 0.3)
//     const decreaseFifteen = Math.floor(increseTax - increseTax * 0.15)


//     await prisma.products.create({
//         data: {
//             name,
//             sku,
//             price_selling,
//             color,
//             price_ticket: increseTax,
//             price_card: descreaseTw,
//             price_cash: descreaseThird,
//             price_link: decreaseFifteen,
//             category
//         }
//     }).then(() => console.log("foi"))
// })
// })

