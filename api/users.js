const Query = require("../services/query-builder")
const Encrypt = require("../services/encrypt")
const {
    users,
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
} = require("../schemas/routes")

module.exports = function (fastify, opts, done) {
    async function getAndDeleteCallback(request, reply) {
        const client = await fastify.pg.connect()
        try {
            const { rows } = await client.query(Query.get().build(request))
            return reply.send({ data: rows })
        } finally {
            client.release()
        }
    }

    async function userPostAndPatchCallback(request, reply) {
        const obj = await fastify.pg.transact(async (client) => {
            const user = await client.query(
                `SELECT * FROM users WHERE email = '${request.body.email}';`
            )
            if (user.rows.length > 0) return []

            request.body.password = await Encrypt.get().hash(
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

    fastify.get(
        "/",
        {
            schema: getSchema(users, ["password"]),
        },
        getAndDeleteCallback
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
        userPostAndPatchCallback
    )

    fastify.patch(
        "/:id",
        { schema: patchSchema(users, ["user_uid", "datetime", "password"]) },
        userPostAndPatchCallback
    )

    fastify.delete(
        "/:id",
        { schema: deleteSchema(users) },
        getAndDeleteCallback
    )

    done()
}
