/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'

const HomeController = () => import('#controllers/home_controller')
const SimulateController = () => import('#controllers/simulate_controller')
const SyncController = () => import('#controllers/sync_controller')

router.get('/', [HomeController, 'show'])
router.post('/api/simulate', [SimulateController, 'run'])
router.post('/api/sync', [SyncController, 'run'])
