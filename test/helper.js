'use strict'

const sget = require('simple-get').concat
const stream = require('stream')

module.exports.payloadMethod = function(method, t) {
  const test = t.test
  const app = require('..')()
  const upMethod = method.toUpperCase()
  const loMethod = method.toLowerCase()

  app[loMethod]('/', {
    responseSchema: {
      200: {
        type: 'object',
        properties: {
          hello: {
            type: 'string',
          },
        },
      },
    },
  }, function(request, reply) {
    reply.send(request.body)
  })

  app[loMethod]('/no-schema', function(request, reply) {
    reply.send(request.body)
  })

  app[loMethod]('/with-query', function(request, reply) {
    request.body.hello += request.query.foo
    reply.send(request.body)
  })

  app[loMethod]('/with-limit', {bodyLimit: 1}, function(request, reply) {
    reply.send(request.body)
  })

  app.listen(0, function(err) {
    if (err) {
      t.error(err)
    }

    app.server.unref()

    test(`${upMethod} - correctly replies`, (t) => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        body: {
          hello: 'world',
        },
        json: true,
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, {hello: 'world'})
      })
    })

    test(`${upMethod} - correctly replies with very large body`, (t) => {
      t.plan(3)

      const largeString = 'world'.repeat(13200)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        body: {hello: largeString},
        json: true,
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, {hello: largeString})
      })
    })

    test(`${upMethod} - correctly replies if the content type has the charset`, (t) => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        body: JSON.stringify({hello: 'world'}),
        headers: {
          'content-type': 'application/json;charset=utf-8',
        },
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({hello: 'world'}))
      })
    })

    test(`${upMethod} without schema - correctly replies`, (t) => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port + '/no-schema',
        body: {
          hello: 'world',
        },
        json: true,
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, {hello: 'world'})
      })
    })

    test(`${upMethod} with body and querystring - correctly replies`, (t) => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port + '/with-query?foo=hello',
        body: {
          hello: 'world',
        },
        json: true,
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, {hello: 'worldhello'})
      })
    })

    test(`${upMethod} with no body - correctly replies`, (t) => {
      t.plan(6)

      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port + '/no-schema',
        headers: {'Content-Length': '0'},
        timeout: 500,
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), '')
      })

      // Must use inject to make a request without a Content-Length header
      app.inject({
        method: upMethod,
        url: '/no-schema',
      }, (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
        t.strictEqual(res.payload, '')
      })
    })

    test(`${upMethod} returns 415 - incorrect media type if body is not json`, (t) => {
      t.plan(2)
      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port + '/no-schema',
        body: 'hello world',
        timeout: 500,
      }, (err, response) => {
        t.error(err)
        if (upMethod === 'OPTIONS') {
          t.strictEqual(response.statusCode, 200)
        } else {
          t.strictEqual(response.statusCode, 415)
        }
      })
    })

    if (loMethod === 'options') {
      test('OPTIONS returns 415 - should return 415 if Content-Type is not json', (t) => {
        t.plan(2)
        sget({
          method: upMethod,
          url: 'http://localhost:' + app.server.address().port + '/no-schema',
          body: 'hello world',
          headers: {
            'Content-Type': 'text/plain',
          },
          timeout: 500,
        }, (err, response) => {
          t.error(err)
          t.strictEqual(response.statusCode, 415)
        })
      })
    }

    test(`${upMethod} returns 400 - Bad Request`, (t) => {
      t.plan(4)

      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        body: 'hello world',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 500,
      }, (err, response) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
      })

      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        body: '',
        headers: {'Content-Type': 'application/json'},
        timeout: 500,
      }, (err, response) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
      })
    })

    test(`${upMethod} returns 413 - Payload Too Large`, (t) => {
      t.plan(upMethod === 'OPTIONS' ? 4 : 6)

      sget({
        method: upMethod,
        url: 'http://localhost:' + app.server.address().port,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 1024 * 1024 + 1,
        },
      }, (err, response) => {
        t.error(err)
        t.strictEqual(response.statusCode, 413)
      })

      // Node errors for OPTIONS requests with a stream body and no Content-Length header
      if (upMethod !== 'OPTIONS') {
        var chunk = Buffer.allocUnsafe(1024 * 1024 + 1)
        const largeStream = new stream.Readable({
          read() {
            this.push(chunk)
            chunk = null
          },
        })
        sget({
          method: upMethod,
          url: 'http://localhost:' + app.server.address().port,
          headers: {'Content-Type': 'application/json'},
          body: largeStream,
          timeout: 500,
        }, (err, response) => {
          t.error(err)
          t.strictEqual(response.statusCode, 413)
        })
      }

      sget({
        method: upMethod,
        url: `http://localhost:${app.server.address().port}/with-limit`,
        headers: {'Content-Type': 'application/json'},
        body: {},
        json: true,
      }, (err, response) => {
        t.error(err)
        t.strictEqual(response.statusCode, 413)
      })
    })
  })
}
