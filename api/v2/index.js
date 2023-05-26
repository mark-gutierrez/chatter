module.exports = function (fastify, opts, done) {
    fastify.register(require("./utils"), {
        prefix: "/",
    })
    done()
}
