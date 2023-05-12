module.exports = function (fastify, opts, done) {
    fastify.register(require("./auth"), { prefix: "/auth" })
    fastify.register(require("./protected"), {
        prefix: "/",
        onRequest: [fastify.authenticate],
    })

    done()
}
