const { user_conversation } = require("../../schemas/models")

const { getSchema, postSchema } = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // User_Conversation route
    fastify.get(
        "/",
        {
            schema: getSchema(user_conversation),
        },
        fastify.callback
    )
    fastify.post(
        "/",
        {
            schema: postSchema(user_conversation, [
                "user_uid",
                "conversation_uid",
            ]),
        },
        fastify.callback
    )

    done()
}
