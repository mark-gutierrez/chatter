const Query = require("../services/query-builder")
const {
    messages,
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
} = require("../schemas/routes")

module.exports = function (fastify, opts, done) {
    async function callback(request, reply) {
        const client = await fastify.pg.connect()
        try {
            const { rows } = await client.query(Query.get().build(request))
            reply.send({ data: rows })
        } finally {
            client.release()
        }
    }

    fastify.get(
        "/",
        {
            schema: getSchema(messages),
        },
        callback
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
        callback
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
        callback
    )

    fastify.delete("/:id", { schema: deleteSchema(messages) }, callback)

    done()
}
