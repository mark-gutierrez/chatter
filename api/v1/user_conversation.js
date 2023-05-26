module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // User_Conversation route
    fastify.get(
        "/",
        {
            schema: fastify.s.build({
                model: "user_conversation",
                method: "GET",
            }),
        },
        fastify.callback
    )
    fastify.post(
        "/",
        {
            schema: fastify.s.build({
                model: "user_conversation",
                method: "POST",
                required: ["user_uid", "conversation_uid"],
            }),
        },
        fastify.callback
    )

    done()
}
