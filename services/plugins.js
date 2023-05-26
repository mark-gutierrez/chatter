const fp = require("fastify-plugin")
const QueryFactory = require("./query")
const QueryProxy = require("./query-proxy")
const fileReader = require("./file-reader")
const SchemaSingleton = require("./schema")

module.exports = fp(function (fastify, opts, done) {
    fastify.decorate("q", QueryFactory)
    fastify.decorate("r", QueryProxy)
    fastify.decorate("s", SchemaSingleton)
    fastify.decorate("file", fileReader)
    done()
})
