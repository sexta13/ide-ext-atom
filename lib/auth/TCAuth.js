'use strict'

const _ = require('lodash')
const requestPromise = require('request-promise')

/**
 * [TCAuth auth control class]
 * @param       {[o]bject} config [user config]
 * @param       {[objedct]} logger [logger function]
 * @constructor
 */
function TCAuth (config, logger) {
  var self = this
  self.logger = logger
  self.config = config
}

/**
 * [login login function]
 * @param  {[string]}   username
 * @param  {[string]}   password ]
 * @param  {Function} cb       [callback function]
 */
TCAuth.prototype.login = function login (username, password, cb) {
  var self = this

  const v2TokenBody = {
    username: username,
    password: password,
    client_id: self.config.CLIENT_ID,
    sso: false,
    scope: 'openid profile offline_access',
    response_type: 'token',
    connection: self.config.CLIENT_V2CONNECTION || 'LDAP',
    grant_type: 'password',
    device: 'Browser'
  }

  const reqOpts = {
    method: 'POST',
    uri: self.config.AUTHN_URL,
    json: true,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    },
    body: v2TokenBody
  }

  requestPromise(reqOpts).then(function (res) {
    self.fetchV3Token(res, cb)
  }).catch(function (err) {
    cb(err)
  })
}

/**
 * [fetchV3Token called when login success]
 * @param  {[string]}   v2Token
 * @param  {Function} cb      [callback function]
 */
TCAuth.prototype.fetchV3Token = function fetchV3Token (v2Token, cb) {
  var self = this

  const v2IdToken = _.get(v2Token, 'id_token', '')

  const v3ReqBody = {
    param: {
      externalToken: v2IdToken,
      refreshToken: _.get(v2Token, 'refresh_token', '')
    }
  }

  const reqOpts = {
    method: 'POST',
    uri: self.config.AUTHZ_URL,
    headers: {
      'cache-control': 'no-cache',
      authorization: 'Bearer ' + v2IdToken,
      'content-type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify(v3ReqBody)
  }

  requestPromise(reqOpts).then(function (body) {
    const tcJSON = JSON.parse(body)
    const token = _.get(tcJSON, 'result.content.token', '')
    cb(null, token)
  }).catch(function (err) {
    cb(err)
  })
}

module.exports = TCAuth
