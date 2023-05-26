module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Messages route
    fastify.get(
        "/",
        {
            schema: fastify.s.build({ model: "messages", method: "GET" }),
        },
        fastify.callback
    )
    fastify.post(
        "/",
        {
            schema: fastify.s.build({
                model: "messages",
                request: ["user_uid", "conversation_uid", "text"],
                required: ["user_uid", "conversation_uid", "text"],
                method: "POST",
            }),
        },
        fastify.callback
    )
    fastify.patch(
        "/:id",
        {
            schema: fastify.s.build({
                model: "messages",
                request: ["text"],
                required: ["text"],
                method: "POST",
            }),
        },
        fastify.callback
    )
    fastify.delete(
        "/:id",
        {
            schema: fastify.s.build({
                model: "messages",
                method: "DELETE",
            }),
        },
        fastify.callback
    )

    done()
}
