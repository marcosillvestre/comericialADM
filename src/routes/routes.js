import bodyParser from 'body-parser';
import { Router } from 'express';
import RegisterContaAzulController from '../app/controllers/contaAzulRegister.js';
import HistoricController from '../app/controllers/historicController.js';
import PostConttroller from "../app/controllers/postConttroller.js";
import SessionController from "../app/controllers/sessionController.js";
import UnityController from "../app/controllers/unitiesController.js";
import UserController from "../app/controllers/userController.js";
import auth from "../middleware/auth.js";
const routes = Router();


const parser = bodyParser.urlencoded({ extended: false })

routes.post('/contrato', parser, PostConttroller.sender)

routes.post('/login', SessionController.store)

routes.post('/redefinir-senha', SessionController.forgetPassword)

routes.post('/nova-senha', SessionController.redefinePassword)




// autenticated routes
routes.use(auth)

routes.post('/cliente', RegisterContaAzulController.storeCostumer)
routes.post('/registro-conta-azul', RegisterContaAzulController.storeContract)
routes.post('/venda', RegisterContaAzulController.storeSale)


routes.post('/cadastro', UserController.store)


routes.get('/historico', HistoricController.index)


routes.post('/page-update', PostConttroller.searchSync)

routes.post('/grafico', PostConttroller.graphData)

routes.post('/comissao', PostConttroller.comissionData)

routes.get('/unidades', UnityController.unities)
routes.post('/unidades', UnityController.storeUnities)

routes.delete('/unidades/:id', UnityController.deleteUnities)

routes.post('/periodo', PostConttroller.indexPeriod)


routes.get('/contrato/:unity', PostConttroller.getRecent)

routes.get('/users', UserController.index)

routes.delete('/users/:id', UserController.delete)

routes.put('/controle/:id', PostConttroller.update) //

routes.delete('/controle/:id', PostConttroller.delete)//

routes.put('/multi-update', PostConttroller.updateMany) //




export default routes
