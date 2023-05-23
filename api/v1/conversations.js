const { conversations } = require("../../schemas/models")

const { getSchema, postSchema, deleteSchema } = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Conversations route
    fastify.get("/", { schema: getSchema(conversations) }, fastify.callback)
    fastify.post(
        "/",
        {
            schema: postSchema(
                conversations,
                [],
                ["conversation_uid", "datetime"]
            ),
        },
        fastify.callback
    )
    fastify.delete(
        "/:id",
        { schema: deleteSchema(conversations) },
        fastify.callback
    )

    done()
}
