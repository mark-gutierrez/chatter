const Query = require("../services/query-builder")
const {
    user_conversation,
    getSchema,
    postSchema,
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
            schema: getSchema(user_conversation),
        },
        callback
    )

    fastify.post(
        "/",
        {
            schema: postSchema(user_conversation, [
                "user_uid",
                "conversation_uid",
            ]),
        },
        callback
    )

    done()
}
