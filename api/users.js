const Query = require("../services/query-builder")
const { users, getSchema, postSchema } = require("../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.get(
        "/",
        {
            schema: getSchema(users, ["password"]),
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
            schema: postSchema(
                users,
                ["email", "password", "username"],
                ["user_uid", "datetime"]
            ),
        },

        async function (request, reply) {
            const obj = await fastify.pg.transact(async (client) => {
                const user = await client.query(
                    `SELECT * FROM users WHERE email = '${request.body.email}';`
                )
                if (user.rows.length > 0) return []

                console.log(request.body)
                console.log(users)

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
