const Query = require("../services/query-builder")

module.exports = function (fastify, opts, done) {
    fastify.get(
        "/",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        user_uid: { type: "string" },
                        email: { type: "string" },
                        password: { type: "string" },
                        datetime: { type: "string" },
                        username: { type: "string" },
                        select: { type: "string" },
                        sort: { type: "string" },
                        page: { type: "number" },
                        limit: { type: "number" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            ok: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        user_uid: { type: "string" },
                                        email: { type: "string" },
                                        password: { type: "string" },
                                        datetime: { type: "string" },
                                        username: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async function (request, reply) {
            const client = await fastify.pg.connect()
            try {
                const { rows } = await client.query(Query.get().build(request))
                reply.send({ ok: rows })
            } finally {
                client.release()
            }
        }
    )

    fastify.post("/", async function (request, reply) {
        // const client = await fastify.pg.connect()
        // const {
        //     body: { email, password, username },
        // } = request

        // try {
        //     const { rows } = await client.query(
        //         `INSERT into users (user_uid, email, password, username, datetime) values (uuid_generate_v4() ,'${email}','${password}','${username}', now());`
        //     )
        //     return rows
        // } finally {
        //     client.release()
        // }

        return { ok: Query.get().build(request) }
    })

    fastify.patch("/:id", async function (request, reply) {
        console.log(request)
        return { ok: Query.get().build(request) }
    })

    fastify.delete("/:id", async function (request, reply) {
        return { ok: Query.get().build(request) }
    })

    done()
}
