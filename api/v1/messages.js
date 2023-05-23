const { messages } = require("../../schemas/models")

const {
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
} = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Messages route
    fastify.get(
        "/",
        {
            schema: getSchema(messages),
        },
        fastify.callback
    )
    fastify.post(
        "/",
        {
            schema: postSchema(
                messages,
                ["user_uid", "conversation_uid", "text"],
                ["message_uid", "datetime"]
            ),
        },
        fastify.callback
    )
    fastify.patch(
        "/:id",
        {
            schema: patchSchema(messages, [
                "conversation_uid",
                "datetime",
                "user_uid",
                "message_uid",
            ]),
        },
        fastify.callback
    )
    fastify.delete("/:id", { schema: deleteSchema(messages) }, fastify.callback)

    done()
}
