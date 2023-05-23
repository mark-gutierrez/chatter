const fp = require("fastify-plugin")
const QueryFactory = require("./query-builder")
const RequestToQuerySingleton = require("./route-query")
const fileReader = require("./file-reader")

module.exports = fp(function (fastify, opts, done) {
    fastify.decorate("q", QueryFactory)
    fastify.decorate("r", RequestToQuerySingleton)
    fastify.decorate("file", fileReader)
    done()
})
