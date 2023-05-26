module.exports = function (fastify, opts, done) {
    fastify.register(require("./v1"), { prefix: "/v1" })
    fastify.register(require("./v2"), { prefix: "/v2" })
    done()
}
