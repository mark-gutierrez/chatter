const Query = require("../services/query-builder")
const {
    conversations,
    getSchema,
    postSchema,
    deleteSchema,
} = require("../schemas/routes")

module.exports = function (fastify, opts, done) {
    async function callback(request, reply) {
        const client = await fastify.pg.connect()
        try {
            console.log(Query.get().build(request))
            const { rows } = await client.query(Query.get().build(request))
            reply.send({ data: rows })
        } finally {
            client.release()
        }
    }

    fastify.get(
        "/",
        {
            schema: getSchema(conversations),
        },
        callback
    )

    fastify.post(
        "/",
        {
            schema: postSchema(conversations, [], ["conversation_uid"]),
        },
        callback
    )

    fastify.delete("/:id", { schema: deleteSchema(conversations) }, callback)

    done()
}
