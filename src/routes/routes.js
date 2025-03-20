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
import CampaignController from '../app/controllers/internal/campaignController.js';
import CustomFieldsController from '../app/controllers/internal/customFieldsController.js';
import OrdersController from '../app/controllers/internal/ordersController.js';
import ProductsController from '../app/controllers/internal/productsController.js';
import RegistersController from '../app/controllers/internal/registersController.js';
import ServicesController from '../app/controllers/internal/servicesController.js';
import UmblerWebhook from '../app/webhooks/umbler.js';
import { storage } from '../config/multer.js';
import auth from "../middleware/auth.js";
import webhookToken from '../middleware/webhooks.js';

const routes = Router();
const parser = bodyParser.urlencoded({ extended: false })
const upload = multer({ storage: storage })




routes.post('/contrato', parser, PostConttroller.sender)


routes.post('/webhook-trello', webhookToken, TrelloWebhook.capture)
routes.post('/feedback', webhookToken, UmblerWebhook.feedBack)
routes.post('/primeira-aula', webhookToken, UmblerWebhook.firstClassAppointment)



routes.post('/login', SessionController.store)

routes.post('/redefinir-senha', SessionController.forgetPassword)

routes.post('/nova-senha', SessionController.redefinePassword)

routes.use(auth) // autenticated routes

routes.get('/contrato/:unity', PostConttroller.getRecent)
routes.get('/matricula/:id', PostConttroller.returnContract)

////////////////////////////
routes.post("/campanha", CampaignController.store)
routes.get("/campanha", CampaignController.index)
routes.put("/campanha/:id", CampaignController.update)
routes.delete("/campanha/:id", CampaignController.delete)


routes.post("/servicos", ServicesController.store)
routes.get("/servicos", ServicesController.index)
routes.put("/servicos/:id", ServicesController.update)
routes.delete("/servicos/:id", ServicesController.delete)

routes.post("/produtos", ProductsController.store)
routes.get("/produtos", ProductsController.index)
routes.put("/produtos/:id", ProductsController.update)
routes.delete("/produtos/:id", ProductsController.delete)

///////////////////////////


routes.post('/files', FilesController.store)
routes.get('/files', FilesController.index)
routes.get('/file', FilesController.downloadFiles)
routes.delete("/file", FilesController.deleteFiles)




routes.post('/uploads', upload.single('file'), AutentiqueController.store)
routes.post('/uploads-recibos', upload.single('file'), AutentiqueController.storeRecipe)
///////////////////

routes.get('/campos-personalizados', CustomFieldsController.index)
routes.post('/campos-personalizados', CustomFieldsController.store)
routes.delete('/campos-personalizados/:id', CustomFieldsController.delete)
routes.put('/campos-personalizados', CustomFieldsController.update)

///////////////////


// routes.post('/novos-contratos', ContractsController.store)
// routes.delete('/novos-contratos/:id', ContractsController.delete)
// routes.put('/novos-contratos', ContractsController.update)


routes.post('/pedidos', OrdersController.index)
routes.post('/pedidos-query', OrdersController.query)

routes.delete('/pedidos/:id', OrdersController.delete)
routes.put('/pedidos', OrdersController.update)
routes.put('/multi-pedidos', OrdersController.updateManyOrders)

routes.post('/pedidos', OrdersController.store)


// routes.put('/pedidos', OrdersController.edit)
// routes.put('/linkpedido', OrdersController.putDataOrders)


routes.post('/cliente', RegisterContaAzulController.storeCostumer)
routes.post('/registro-conta-azul', RegisterContaAzulController.storeContract)
routes.post('/venda', RegisterContaAzulController.storeSale)
routes.post('/taxa', RegisterContaAzulController.storeEnrollmentFee)


routes.post('/cadastro', UserController.store)


routes.get('/pessoal', HistoricController.indexPersonalHistoric)
routes.get('/historico', HistoricController.index)


routes.get('/comissao', PostConttroller.comissionData)

routes.get('/unidades', UnityController.unities)
routes.post('/unidades', UnityController.storeUnities)
routes.delete('/unidades/:id', UnityController.deleteUnities)


routes.get('/registro', RegistersController.index)

routes.put('/registro/:id', RegistersController.update)
//////////////////
routes.get('/query', RegistersController.query)
// routes.get('/query', PostConttroller.query)



routes.get('/users', UserController.index)

routes.delete('/users/:id', UserController.delete)



// routes.put('/controle/:id', PostConttroller.update) //

routes.delete('/controle/:id', RegistersController.delete)//




export default routes

