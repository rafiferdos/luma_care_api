import { cors } from 'hono/cors'

import config from './app/config'
import {
  globalErrorHandler,
  notFoundHandler
} from './app/middlewares/globalErrorHandler'
import { factory } from './factory'
import { AuthRoutes } from './app/module/auth/auth.route'

const app = factory.createApp()

app.use(
  '*',
  cors({
    origin: config.frontend_url,
    credentials: true
  })
)

app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Welcome to LumaCare API'
  })
})

app.route('/api/v1/auth', AuthRoutes)

app.notFound(notFoundHandler)
app.onError(globalErrorHandler)

export default app
