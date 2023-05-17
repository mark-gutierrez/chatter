module.exports = function (fastify, opts, done) {
    fastify.register(require("./v1"), { prefix: "/v1" })

    done()
}
