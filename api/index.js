module.exports = function (fastify, opts, done) {
    fastify.register(require("./users"), { prefix: "/users" })
    fastify.register(require("./conversations"), {
        prefix: "/conversations",
    })
    fastify.register(require("./user_conversation"), {
        prefix: "/user_conversation",
    })
    fastify.register(require("./messages"), {
        prefix: "/messages",
    })

    done()
}
