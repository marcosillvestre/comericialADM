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
// import ContractsController from '../app/controllers/contractsController.js';
import FilesController from '../app/controllers/external/filesController.js';
import CustomFieldsController from '../app/controllers/internal/customFieldsController.js';
import OrdersController from '../app/controllers/internal/ordersController.js';
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


routes.post('/files', FilesController.store)
routes.get('/files', FilesController.index)
routes.get('/file', FilesController.downloadFiles)
routes.delete("/file", FilesController.deleteFiles)




routes.post('/uploads', upload.single('file'), AutentiqueController.store)
///////////////////

routes.get('/campos-personalizados', CustomFieldsController.index)
routes.post('/campos-personalizados', CustomFieldsController.store)
routes.delete('/campos-personalizados/:id', CustomFieldsController.delete)
routes.put('/campos-personalizados', CustomFieldsController.update)

///////////////////


// routes.get('/novos-contratos', ContractsController.index)
// routes.post('/novos-contratos', ContractsController.store)
// routes.delete('/novos-contratos/:id', ContractsController.delete)
// routes.put('/novos-contratos', ContractsController.update)


routes.get('/pedidos', OrdersController.index)
routes.put('/pedidos', OrdersController.update)
routes.put('/linkpedido', OrdersController.putDataOrders)


routes.post('/cliente', RegisterContaAzulController.storeCostumer)
routes.post('/registro-conta-azul', RegisterContaAzulController.storeContract)
routes.post('/venda', RegisterContaAzulController.storeSale)
routes.post('/taxa', RegisterContaAzulController.storeEnrollmentFee)


routes.post('/cadastro', UserController.store)


routes.get('/pessoal', HistoricController.indexPersonalHistoric)
routes.get('/historico', HistoricController.index)


routes.post('/page-update', PostConttroller.searchSync)

routes.post('/grafico', PostConttroller.graphData)


routes.get('/comissao', PostConttroller.comissionData)








routes.get('/unidades', UnityController.unities)
routes.post('/unidades', UnityController.storeUnities)
routes.delete('/unidades/:id', UnityController.deleteUnities)




routes.get('/periodo', PostConttroller.indexPeriod)
routes.get('/query', PostConttroller.query)


routes.get('/contrato/:unity', PostConttroller.getRecent)

routes.get('/users', UserController.index)

routes.delete('/users/:id', UserController.delete)

routes.put('/controle/:id', PostConttroller.update) //

routes.delete('/controle/:id', PostConttroller.delete)//

routes.put('/multi-update', PostConttroller.updateMany) //




export default routes

