// import app from './app'
// import config from './app/config'
// import { prisma } from './app/lib/prisma'

import { serve } from '@hono/node-server'

import app from './app'
import config from './app/config'
import { prisma } from './app/lib/prisma'

// const PORT = config.port

// const main = async () => {
//   try {
//     await prisma.$connect()
//     console.log('Connected to the database successfully.')
//     app.listen(PORT, () => {
//       console.log(`Server is running on port ${PORT}`)
//     })
//   } catch (error) {
//     console.error('Error starting the server:', error)
//     await prisma.$disconnect()
//     process.exit(1)
//   }
// }

// main()

const port = Number(config.port ?? 5000)

const main = async () => {
  try {
    await prisma.$connect()
    console.log('Connected to the database successfully.')

    const server = serve(
      {
        fetch: app.fetch,
        port
      },
      (info) => {
        console.log(`Server is running on port ${info.port}`)
      }
    )

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`)

      server.close(async (error) => {
        await prisma.$disconnect()
        if (error) {
          console.error('Error shutting down the server:', error)
          process.exit(1)
        }
        process.exit(0)
      })
    }
    process.once('SIGINT', () => shutdown('SIGINT'))
    process.once('SIGTERM', () => shutdown('SIGTERM'))
  } catch (error) {
    console.error('Error starting the server:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

void main()
