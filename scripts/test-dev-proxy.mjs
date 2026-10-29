import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { createServer } from 'vite'

test('Vite proxies API requests to the configured private PocketBase port', async t => {
  const backend = createHttpServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Connection', 'close')
    response.end(JSON.stringify({ path: request.url }))
  })
  backend.listen(0, '127.0.0.1')
  await once(backend, 'listening')
  t.after(() => new Promise(resolve => backend.close(resolve)))
  const previous = process.env.TRIVIA_POCKETBASE_PORT
  process.env.TRIVIA_POCKETBASE_PORT = String(backend.address().port)
  t.after(() => {
    if (previous === undefined) delete process.env.TRIVIA_POCKETBASE_PORT
    else process.env.TRIVIA_POCKETBASE_PORT = previous
  })
  const vite = await createServer({ server: { middlewareMode: true } })
  t.after(() => vite.close())
  const frontend = createHttpServer(vite.middlewares)
  frontend.listen(0, '127.0.0.1')
  await once(frontend, 'listening')
  t.after(() => new Promise(resolve => frontend.close(resolve)))
  const origin = `http://127.0.0.1:${frontend.address().port}`
  for (const path of ['/api/health', '/api/collections/questions/records?perPage=1', '/api/files/questions/id/image.png']) {
    const response = await fetch(`${origin}${path}`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /application\/json/)
    assert.deepEqual(await response.json(), { path })
  }
})
