// import cookieParser from 'cookie-parser'
// import cors from 'cors'
// import express, { type Application, type Request, type Response } from 'express'
// import httpStatus from 'http-status'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import config from './app/config'
import {
  globalErrorHandler,
  notFoundHandler
} from './app/middlewares/globalErrorHandler'

// import config from './app/config'
// import globalErrorHandler from './app/middlewares/globalErrorHandler'
// import notFound from './app/middlewares/notFound'
// import { AuthRoutes } from './app/module/auth/auth.route';

// const app: Application = express()

// app.use(
//   cors({
//     origin: config.frontend_url,
//     credentials: true
//   })
// )

// // Enable URL-encoded form data parsing
// app.use(express.urlencoded({ extended: true }))

// // Middleware to parse JSON bodies
// app.use(express.json())
// app.use(cookieParser())

// app.use("/api/v1/auth", AuthRoutes)

// // Basic route
// app.get('/', async (_req: Request, res: Response) => {
//   res.status(httpStatus.OK).json({
//     success: true,
//     message: 'Welcome to PH Healthcare System Backend'
//   })
// })

// app.use(globalErrorHandler)
// app.use(notFound)

// export default app

const app = new Hono()

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

app.notFound(notFoundHandler)
app.onError(globalErrorHandler)

export default app
