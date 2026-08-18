import { OAuth2Client } from 'google-auth-library'

import config from '../config'

const client = new OAuth2Client(config.google_client_id)

export const verifyGoogleToken = async (idToken: string) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.google_client_id
  })
  return ticket.getPayload()
}
