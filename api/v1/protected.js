const {
    users,
    conversations,
    user_conversation,
    messages,
} = require("../../schemas/models")

const {
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
} = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)
    // Users route
    fastify.get(
        "/users",
        {
            schema: getSchema(users, ["password"]),
        },
        fastify.callback
    )
    fastify.patch(
        "/users/:id",
        {
            schema: patchSchema(users, ["user_uid", "datetime", "password"]),
        },
        fastify.callback
    )
    fastify.delete(
        "/users/:id",
        { schema: deleteSchema(users) },
        fastify.callback
    )

    // Conversations route
    fastify.get(
        "/conversations",
        { schema: getSchema(conversations) },
        fastify.callback
    )
    fastify.post(
        "/conversations",
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
        "/conversations/:id",
        { schema: deleteSchema(conversations) },
        fastify.callback
    )

    // User_Conversation route
    fastify.get(
        "/user_conversation",
        {
            schema: getSchema(user_conversation),
        },
        fastify.callback
    )
    fastify.post(
        "/user_conversation",
        {
            schema: postSchema(user_conversation, [
                "user_uid",
                "conversation_uid",
            ]),
        },
        fastify.callback
    )

    // Messages route
    fastify.get(
        "/messages",
        {
            schema: getSchema(messages),
        },
        fastify.callback
    )
    fastify.post(
        "/messages",
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
        "/messages/:id",
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
    fastify.delete(
        "/messages/:id",
        { schema: deleteSchema(messages) },
        fastify.callback
    )

    done()
}
