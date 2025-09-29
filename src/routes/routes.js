import bodyParser from 'body-parser';
import { Router } from 'express';
import RegisterContaAzulController from '../app/controllers/external/contaAzulRegister.js';
import HistoricController from '../app/controllers/internal/historicController.js';
import PostConttroller from "../app/controllers/internal/postConttroller.js";
import SessionController from "../app/controllers/internal/sessionController.js";
import UnityController from "../app/controllers/internal/unitiesController.js";
import UserController from "../app/controllers/internal/userController.js";
import TrelloWebhook from '../app/webhooks/trello.js';

import multer from 'multer';
import AutentiqueController from '../app/controllers/external/autentiqueController.js';
import FilesController from '../app/controllers/external/filesController.js';
import BillingRulesController from '../app/controllers/internal/billingRulesController.js';
import CampaignController from '../app/controllers/internal/campaignController.js';
import CategorieProductController from "../app/controllers/internal/categoriesController.js";
import ContractsController from '../app/controllers/internal/crmContractsController.js';
import CustomFieldsController from '../app/controllers/internal/customFieldsController.js';
import KitsController from '../app/controllers/internal/kitsController.js';
import OrdersController from '../app/controllers/internal/ordersController.js';
import ProductsController from '../app/controllers/internal/productsController.js';
import RegistersController from '../app/controllers/internal/registersController.js';
import RequestsController from '../app/controllers/internal/requestsController.js';
import ServicesController from '../app/controllers/internal/servicesController.js';
import SupliersController from '../app/controllers/internal/supliersController.js';
import WhatsappController from '../app/controllers/internal/whatsappController.js';
import UmblerWebhook from '../app/webhooks/umbler.js';
import { storage } from '../config/multer.js';
import auth from "../middleware/auth.js";
import webhookToken from '../middleware/webhooks.js';

const routes = Router();
const parser = bodyParser.urlencoded({ extended: false })
const upload = multer({ storage: storage })




routes.post('/contrato', webhookToken, PostConttroller.sender)


routes.post('/webhook-trello', webhookToken, TrelloWebhook.capture)
routes.post('/feedback', webhookToken, UmblerWebhook.feedBack)
routes.post('/primeira-aula', webhookToken, UmblerWebhook.firstClassAppointment)



routes.post('/login', SessionController.store)

routes.post('/redefinir-senha', SessionController.forgetPassword)

routes.post('/nova-senha', SessionController.redefinePassword)


routes.post('/cliente', RegisterContaAzulController.storeCostumer)
routes.post('/registro-conta-azul', RegisterContaAzulController.storeContract)
routes.post('/venda', RegisterContaAzulController.storeSale)
routes.post('/taxa', RegisterContaAzulController.storeEnrollmentFee)

//////////////
routes.use(auth) // autenticated routes

routes.post('/mensagem', WhatsappController.store)


routes.get('/funis', PostConttroller.funnels)

routes.get('/contrato/:unity', ContractsController.getContracts)
routes.get('/contrato-query/:unity', ContractsController.queryContracts)



routes.post('/matricula/:id', PostConttroller.returnContract)

routes.post("/campanha-query", CampaignController.query)
routes.post("/campanhas", CampaignController.index)

routes.post("/campanha", CampaignController.store)
routes.get("/campanhas-totais", CampaignController.indexFilter)
routes.put("/campanha/:id", CampaignController.update)
routes.delete("/campanha/:id", CampaignController.delete)

routes.get("/servicos-totais", ServicesController.indexFilter)
routes.post("/servico-query", ServicesController.query)
routes.post("/servico", ServicesController.store)
routes.post("/servicos", ServicesController.index)
routes.put("/servicos/:id", ServicesController.update)
routes.delete("/servicos/:id", ServicesController.delete)

routes.post("/regua", BillingRulesController.store)
routes.post("/reguas", BillingRulesController.index)
routes.put("/reguas/:id", BillingRulesController.update)
routes.delete("/reguas/:id", BillingRulesController.delete)

routes.post("/produto", ProductsController.store)
routes.post("/produtos", ProductsController.index)
routes.post("/produto-query", ProductsController.query)
routes.get("/produtos-totais", ProductsController.indexFilter)
routes.put("/produtos/:id", ProductsController.update)
routes.delete("/produtos/:id", ProductsController.delete)

routes.post("/kit", KitsController.store)
routes.post("/kits", KitsController.index)
routes.get("/kits-totais", KitsController.indexFilter)
routes.put("/kits/:id", KitsController.update)
routes.delete("/kits/:id", KitsController.delete)

routes.post("/categoria", CategorieProductController.store)
routes.post("/categorias", CategorieProductController.index)
routes.get("/categorias-totais", CategorieProductController.indexFilter)
routes.put("/categoria/:id", CategorieProductController.update)
routes.delete("/categoria/:id", CategorieProductController.delete)

routes.post("/novo-fornecedor", SupliersController.store)
routes.post("/fornecedor", SupliersController.index)
routes.post("/fornecedor-query", SupliersController.query)
routes.get("/fornecedor-totais", SupliersController.indexFilter)
routes.put("/fornecedor/:id", SupliersController.update)
routes.delete("/fornecedor/:id", SupliersController.delete)


routes.post("/nova-requisicao", RequestsController.store)
routes.post("/requisicao", RequestsController.index)
routes.post('/requisicao-query', RequestsController.query)

routes.delete("/fornecedor/:id", RequestsController.delete)


routes.post('/files', FilesController.store)
routes.get('/files', FilesController.index)
routes.get('/file', FilesController.downloadFiles)
routes.delete("/file", FilesController.deleteFiles)




routes.post('/uploads', upload.single('file'), AutentiqueController.store)
routes.post('/uploads-recibos', upload.single('file'), AutentiqueController.storeRecipe)


routes.get('/campos-personalizados-totais', CustomFieldsController.indexFilter)
routes.post('/campos-personalizados', CustomFieldsController.index)
routes.post('/campo-personalizado', CustomFieldsController.store)

routes.delete('/campos-personalizados/:id', CustomFieldsController.delete)
routes.put('/campos-personalizados/:id', CustomFieldsController.update)


routes.post('/pedidos', OrdersController.index)
routes.post('/fazer-pedido', OrdersController.orderProducts)
routes.post('/pedidos-query', OrdersController.query)

routes.delete('/pedidos/:id', OrdersController.delete)
routes.put('/pedidos', OrdersController.update)
routes.put('/multi-pedidos', OrdersController.updateManyOrders)

routes.post('/pedidos', OrdersController.storeMany)





routes.get('/pessoal', HistoricController.indexPersonalHistoric)
routes.get('/historico', HistoricController.index)


routes.post('/comissao', PostConttroller.comissionData)

routes.get('/unidades', UnityController.unities)
routes.post('/unidades', UnityController.storeUnities)
routes.delete('/unidades/:id', UnityController.deleteUnities)



routes.put('/registros/:id', RegistersController.multiUpdates)
routes.put('/registro/:id', RegistersController.update)

routes.post('/registro', RegistersController.index)
routes.get('/registro-unico/:id', RegistersController.getRegisterById)
routes.post('/registro-query', RegistersController.query)
routes.delete('/registro/:id', RegistersController.delete)//



routes.post('/cadastro', UserController.store)
routes.post('/usuarios', UserController.index)
routes.put('/usuarios', UserController.update)

routes.delete('/usuarios/:id', UserController.delete)





export default routes

