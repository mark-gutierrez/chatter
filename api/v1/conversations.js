module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Conversations route
    fastify.get(
        "/",
        { schema: fastify.s.build({ model: "conversations", method: "GET" }) },
        fastify.callback
    )
    fastify.post(
        "/",
        {
            schema: fastify.s.build({ model: "conversations", method: "POST" }),
        },
        fastify.callback
    )
    fastify.delete(
        "/:id",
        {
            schema: fastify.s.build({
                model: "conversations",
                method: "DELETE",
            }),
        },
        fastify.callback
    )

    done()
}
