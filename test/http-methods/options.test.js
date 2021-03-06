'use strict'

require('./body-tests')('OPTIONS')

const t = require('tap')
const medley = require('../..')

t.test('auto OPTIONS response', (t) => {
  t.plan(12)

  const app = medley()

  app.get('/', (req, res) => {
    res.send({hello: 'world'})
  })

  app.put('/put', (req, res) => {
    res.send({hello: 'world'})
  })

  app.route({
    method: ['DELETE', 'GET', 'HEAD', 'POST'],
    path: '/multi',
    handler() {
      t.fail('handler should not be called')
    },
  })

  app.inject({
    method: 'OPTIONS',
    url: '/',
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.allow, 'GET,HEAD')
    t.equal(res.payload, 'GET,HEAD')
  })

  app.inject({
    method: 'OPTIONS',
    url: '/put',
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.allow, 'PUT')
    t.equal(res.payload, 'PUT')
  })

  app.inject({
    method: 'OPTIONS',
    url: '/multi',
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.allow, 'DELETE,GET,HEAD,POST')
    t.equal(res.payload, 'DELETE,GET,HEAD,POST')
  })
})

t.test('hooks run on auto OPTIONS response', (t) => {
  t.plan(9)

  const app = medley()

  app.addHook('onRequest', (req, res, next) => {
    t.deepEqual(req.query, {foo: 'asd'})
    next()
  })

  app.addHook('preHandler', (req, res, next) => {
    t.deepEqual(req.query, {foo: 'asd'})
    next()
  })

  app.delete('/', (req, res) => {
    res.send({hello: 'world'})
  })

  app.addHook('onSend', (req, res, payload, next) => {
    t.deepEqual(req.query, {foo: 'asd'})
    next()
  })

  app.addHook('onFinished', (req, res) => {
    t.deepEqual(req.query, {foo: 'asd'})
    t.equal(res.headersSent, true)
  })

  app.inject({
    method: 'OPTIONS',
    url: '/?foo=asd',
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.allow, 'DELETE')
    t.equal(res.payload, 'DELETE')
  })
})

t.test('OPTIONS request with Content-Type but no body', (t) => {
  t.plan(4)

  const app = medley()

  app.options('/', (req, res) => {
    t.equal(req.body, undefined)
    res.send('success')
  })

  app.inject({
    method: 'OPTIONS',
    url: '/',
    headers: {
      'Content-Type': 'application/json',
    },
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'success')
  })
})
