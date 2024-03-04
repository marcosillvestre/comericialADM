const category = {
    "Ativo Imobilizado": "875d183f-9c9c-4dfe-ab80-f71fe76d7ade",
    "Categoria padrão": "5898f1c6-bc24-4766-8644-9ec760a09a10",
    "Embalagem": "69743879-17b6-4883-9591-f12aa54b852e",
    "Material de Uso e Consumo": "2f65de25-0636-49fc-a698-9dbc77ba2128",
    "Material Didático - Adults and YA": "a3a3e5a2-9939-46fc-88b8-caf80e6f6b1c",
    "Material Didático - Apostila Español": "44661b5f-9b07-4393-ad7e-7c48a9da1a84",
    "Material Didático - Apostila SC - Adults": "19aa231d-2fff-46a0-a425-f8d62b0286fc",
    "Material Didático - Apostila SC - Teens": "b4c3ec9e-d79c-4c7e-87db-f84ad9ea91fe",
    "Material Didático Dream Kids": "c34793e2-f932-47f2-942d-de8ee5d3e237",
    "Material Didático - Espanhol": "43ff9c63-1c14-4e13-b900-67f2d1446f10",
    "Material Didático Global Changer": "c181a798-dca8-4962-94aa-b3f39c483781",
    "Material Didático Interchange": "42d7678f-3c38-4862-8c63-222d1ab4f503",
    "Material Didático - Kids": "92b38c22-338b-428e-a96a-1afc6fc79f0e",
    "Material Didático Let's Go": "e49047cb-1143-45de-8793-907618856b2c",
    "Material Didático - Little Ones": "60f096fe-fdc5-4ea9-b186-29d68ab16183",
    "Material Didático - Teens": "0ad2f966-7b9a-48cd-bceb-a5f27912b937",
    "Material Didático Touchstone": "c987dd88-5e29-490b-9eb3-2b82e6f7f01e",
    "Material Didático Vitamina": "35bcc443-e694-45af-a243-1c52a0c96d27",
    "Matéria-Prima": "fce794b6-47b4-4109-a9cb-b40390b15b42",
    "Mercadoria para Revenda": "dcc730b4-89a6-4ccf-9dd7-7272345238d7",
    "Outras": "d5e694e4-a85f-433b-ac52-1b3f45acc2f5",
    "Outros insumos": "b4574cdf-45b1-4647-a937-791607be9aba",
    "Produto Acabado": "ddf9b6bb-1bf7-430e-8eb0-2786d5362bd8",
    "Produto em Processo": "c0b7e114-89cf-4c3c-a2e2-83a2998fb59d",
    "Produto Intermediário": "2e3d1ccb-3e67-4f0e-b58a-189767d4c42a",
    "Serviços": "3fc4ef55-bd53-40f5-9336-e6a6339852dc",
    "Subproduto": "52911718-a1ed-4dfa-9d53-ab4acb026159",
}

const CentroAccount = {
    "Caixa Excedente": "77c3e026-eb67-4186-9452-eecde1819377",
    "Caixa Físico": "53319593-041c-4bb5-933f-934437d3815e",
    "CARTÃO INTER PJ": "76677bea-7851-4bd3-99c7-42decb94156e",
    "CARTÃO PJ ITAÚ": "2651a119-5ceb-4d86-b9cc-e7e857326066",
    "Gaveta do frente de caixa": "5d93f78c-6153-445f-ae49-171c61095ebb",
    "Inter_PJ": "feb2af39-163e-432c-ae7c-b587b2d042a7",
    "Itaú_PJ": "bd7f35f4-68c8-4451-8c02-5f7855ee1f3b",
    "Receba Fácil": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "Rede Cartões": "e91cfd12-ba92-4984-97a5-2199dc24dc1b",
    "Yes - Recebimentos no Local": "c8d9e898-3e93-4803-9841-89af2b561b99",
    "Zoop Recebimentos": "a2baa969-0b5d-43c9-9b1e-2356da571e83"
}



const CentroFormaDePagamento = {
    "Boleto": "BANKING_BILLET",
    "Cashback": "CASHBACK",
    "Cheque": "CHECK",
    "Cartão de débito": "DEBIT_CARD",
    "Cartão de crédito": "CREDIT_CARD",
    "Cartão de crédito Via Link": "PAYMENT_LINK",
    "Carteira Digital": "DIGITAL_WALLET",
    "Débito Automático": "BANKING_BILLET",
    "Depósito Bancário": "BANKING_DEPOSIT",
    "Dinheiro": "CASH",
    "Pix": "INSTANT_PAYMENT",
    "Pix Cobrança": "BANKING_BILLET",
    "Sem Pagamento": "WITHOUT_PAYMENT",
    "Transferência Bancária": "BANKING_TRANSFER",
    "Outros": "OTHER",
    "Bolsa": "OTHER"
}


const receive_rules = {
    "BANKING_BILLET": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "CASHBACK": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "CHECK": "",
    "DEBIT_CARD": "e91cfd12-ba92-4984-97a5-2199dc24dc1b",
    "CREDIT_CARD": "e91cfd12-ba92-4984-97a5-2199dc24dc1b",
    "PAYMENT_LINK": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "DIGITAL_WALLET": "",
    "BANKING_DEPOSIT": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "CASH": "53319593-041c-4bb5-933f-934437d3815e",
    "INSTANT_PAYMENT": "feb2af39-163e-432c-ae7c-b587b2d042a7",
    "WITHOUT_PAYMENT": "",
    "BANKING_TRANSFER": "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",
    "OTHER": ""
}


export { CentroAccount, CentroFormaDePagamento, category, receive_rules }

