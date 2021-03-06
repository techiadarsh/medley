'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const app = require('..')()

const opts = {
  responseSchema: {
    200: {
      type: 'object',
      properties: {
        hello: {
          type: 'string',
        },
      },
    },
    201: { // shorthand
      hello: {
        type: 'number',
      },
    },
  },
}

app.get('/string', opts, (request, response) => {
  response.send({hello: 'world'})
})

app.get('/number', opts, (request, response) => {
  response.status(201).send({hello: 55})
})

app.get('/wrong-object-for-schema', opts, (request, response) => {
  response.status(201).send({uno: 1}) // Will send { }
})

// No checks
app.get('/empty', opts, (request, response) => {
  response.status(204).send()
})

app.get('/400', opts, (request, response) => {
  response.status(400).send({hello: 'DOOM'})
})

app.listen(0, (err) => {
  t.error(err)
  app.server.unref()

  test('shorthand - string get ok', (t) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + app.server.address().port + '/string',
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), {hello: 'world'})
    })
  })

  test('shorthand - number get ok', (t) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + app.server.address().port + '/number',
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), {hello: 55})
    })
  })

  test('shorthand - wrong-object-for-schema', (t) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + app.server.address().port + '/wrong-object-for-schema',
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 201)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), {})
    })
  })

  test('shorthand - empty', (t) => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + app.server.address().port + '/empty',
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 204)
      t.strictEqual(body.toString(), '')
    })
  })

  test('shorthand - 400', (t) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + app.server.address().port + '/400',
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), {hello: 'DOOM'})
    })
  })
})
