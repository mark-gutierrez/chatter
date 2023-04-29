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
                            data: {
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
                reply.send({ data: rows })
            } finally {
                client.release()
            }
        }
    )

    fastify.post(
        "/",
        {
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["email", "password", "username"],
                    properties: {
                        email: { type: "string" },
                        password: { type: "string" },
                        username: { type: "string" },
                    },
                },
                response: {
                    201: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        user_uid: { type: "string" },
                                        email: { type: "string" },
                                        datetime: { type: "string" },
                                        username: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    409: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                    },
                },
            },
        },

        async function (request, reply) {
            const obj = await fastify.pg.transact(async (client) => {
                const user = await client.query(
                    `SELECT * FROM users WHERE email = '${request.body.email}';`
                )
                if (user.rows.length > 0) return []

                request.body.password = await fastify.bcrypt.hash(
                    request.body.password
                )

                const { rows } = await client.query(Query.get().build(request))

                return rows
            })

            if (obj.length === 0) {
                reply.code(409).send({ error: "email account already exists" })
            } else {
                reply.code(201).send({ data: obj })
            }
        }
    )

    fastify.patch("/:id", async function (request, reply) {
        console.log(request)
        return { ok: Query.get().build(request) }
    })

    fastify.delete("/:id", async function (request, reply) {
        return { ok: Query.get().build(request) }
    })

    done()
}
