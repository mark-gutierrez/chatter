const { UnauthenticatedError } = require("../../errors")

module.exports = function (fastify, opts, done) {
    fastify.post(
        "/register",
        {
            schema: fastify.s.build({
                model: "users",
                method: "POST",
                request: ["email", "password", "username"],
                required: ["email", "password", "username"],
                response: ["user_uid", "username", "email"],
                secure: false,
            }),
        },
        async function (request, reply) {
            let { email, password, username } = request.body
            password = await fastify.bcrypt.hash(password)

            const obj = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    fastify
                        .q()
                        .model({ model: "users" })
                        .insert({ items: [{ email, password, username }] })
                        .returning()
                        .eval()
                )
                return rows[0]
            })

            reply.code(201).send({
                ...obj,
                token: "Bearer " + fastify.jwt.sign(obj),
            })
        }
    )

    fastify.post(
        "/login",
        {
            schema: fastify.s.build({
                model: "users",
                method: "POST",
                request: ["email", "password"],
                required: ["email", "password"],
                response: ["user_uid", "username", "email"],
                secure: false,
            }),
        },
        async function (request, reply) {
            let { email, password } = request.body

            const obj = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    fastify
                        .q()
                        .model({ model: "users" })
                        .select()
                        .where({ users: { email } })
                        .eval()
                )

                if (rows.length === 0)
                    throw new UnauthenticatedError(`Invalid Login Credentials`)

                const match = await fastify.bcrypt.compare(
                    password,
                    rows[0].password
                )

                if (!match)
                    throw new UnauthenticatedError(`Invalid Login Credentials`)

                return rows[0]
            })

            reply.code(200).send({
                ...obj,
                token: "Bearer " + fastify.jwt.sign(obj),
            })
        }
    )

    done()
}
