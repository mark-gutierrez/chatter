const {
    users,
    conversations,
    user_conversation,
    messages,
} = require("../schemas/models")

const {
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
} = require("../schemas/routes")

const Query = require("../services/route-query")

module.exports = function (fastify, opts, done) {
    async function callback(request, reply) {
        const client = await fastify.pg.connect()
        try {
            const { rows } = await client.query(Query.get().build(request))
            if (request.method === "GET") {
                return reply.send({ data: rows })
            } else {
                reply.send({ ...(rows[0] ?? {}) })
            }
        } finally {
            client.release()
        }
    }

    // Users route
    fastify.get(
        "/users",
        {
            schema: getSchema(users, ["password"]),
            ...opts,
        },
        callback
    )
    fastify.patch(
        "/users/:id",
        {
            schema: patchSchema(users, ["user_uid", "datetime", "password"]),
            ...opts,
        },
        callback
    )
    fastify.delete(
        "/users/:id",
        { schema: deleteSchema(users), ...opts },
        callback
    )

    // Conversations route
    fastify.get(
        "/conversations",
        { schema: getSchema(conversations), ...opts },
        callback
    )
    fastify.post(
        "/conversations",
        {
            schema: postSchema(
                conversations,
                [],
                ["conversation_uid", "datetime"]
            ),
            ...opts,
        },
        callback
    )
    fastify.delete(
        "/conversations/:id",
        { schema: deleteSchema(conversations), ...opts },
        callback
    )

    // User_Conversation route
    fastify.get(
        "/user_conversation",
        {
            schema: getSchema(user_conversation),
            ...opts,
        },
        callback
    )
    fastify.post(
        "/user_conversation",
        {
            schema: postSchema(user_conversation, [
                "user_uid",
                "conversation_uid",
            ]),
            ...opts,
        },
        callback
    )

    // Messages route
    fastify.get(
        "/messages",
        {
            schema: getSchema(messages),
            ...opts,
        },
        callback
    )
    fastify.post(
        "/messages",
        {
            schema: postSchema(
                messages,
                ["user_uid", "conversation_uid", "text"],
                ["message_uid", "datetime"]
            ),
            ...opts,
        },
        callback
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
            ...opts,
        },
        callback
    )
    fastify.delete(
        "/messages/:id",
        { schema: deleteSchema(messages), ...opts },
        callback
    )

    done()
}
