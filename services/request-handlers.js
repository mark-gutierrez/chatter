const fp = require("fastify-plugin")

module.exports = fp(function (fastify, opts, done) {
    fastify.decorate("callback", async function (request, reply) {
        const client = await fastify.pg.connect()
        try {
            const { rows } = await client.query(fastify.r.build(request))
            if (request.method === "GET") {
                return reply.send({ data: rows })
            } else {
                reply.send({ ...(rows[0] ?? {}) })
            }
        } finally {
            client.release()
        }
    })

    done()
})
