import { getPayload } from 'payload'

import config from './payload.config'

// 1x1 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const payload = await getPayload({ config })

// Wait for Mongoose's background index builds, which otherwise collide with the first transactions
await Promise.all(Object.values(payload.db.connection.models).map((model) => model.init()))

const createImage = (name: string) =>
  payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: name },
    file: { data: png, mimetype: 'image/png', name: `${name}.png`, size: png.length },
  })

const a = await createImage('image-a')
const b = await createImage('image-b')

const transactions = payload.db.transactionOptions !== false
payload.logger.info(`Transactions enabled: ${transactions}`)

const attempt = async (label: string, imageA: string, imageB: string, runs = 10) => {
  let failures = 0
  let lastError = ''
  for (let i = 0; i < runs; i++) {
    try {
      await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: { title: label, imageA, imageB },
      })
    } catch (error) {
      failures++
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  payload.logger.info(
    `${label}: ${failures}/${runs} creates failed${lastError ? ` (${lastError})` : ''}`,
  )
  return failures
}

await attempt('Same image in both fields', a.id, a.id)
const failures = await attempt('Different images', a.id, b.id)

const post = await payload.create({
  collection: 'posts',
  overrideAccess: true,
  data: { title: 'Update', imageA: a.id, imageB: a.id },
})
await payload.update({
  collection: 'posts',
  id: post.id,
  overrideAccess: true,
  data: { imageB: b.id },
})
payload.logger.info('Update to different images: succeeded')

process.exit(failures > 0 ? 1 : 0)
