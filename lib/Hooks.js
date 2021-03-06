'use strict'

const supportedHooks = [
  'onRequest',
  'preHandler',
  'onSend',
  'onFinished',
]

function Hooks() {
  this.onRequest = []
  this.preHandler = []
  this.onSend = []
  this.onFinished = []
}

Hooks.prototype.validate = function(hook, fn) {
  if (typeof hook !== 'string') {
    throw new TypeError('The hook name must be a string')
  }
  if (typeof fn !== 'function') {
    throw new TypeError('The hook callback must be a function')
  }
  if (supportedHooks.indexOf(hook) === -1) {
    throw new Error(`${hook} hook not supported!`)
  }
}

Hooks.prototype.add = function(hook, fn) {
  this.validate(hook, fn)
  this[hook].push(fn)
}

function buildHooks(h) {
  const hooks = new Hooks()
  hooks.onRequest = h.onRequest.slice()
  hooks.preHandler = h.preHandler.slice()
  hooks.onSend = h.onSend.slice()
  hooks.onFinished = h.onFinished.slice()
  return hooks
}

module.exports = Hooks
module.exports.buildHooks = buildHooks
