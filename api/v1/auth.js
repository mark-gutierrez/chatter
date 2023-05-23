const { UnauthenticatedError } = require("../../errors")
const { users } = require("../../schemas/models")
const { authSchema } = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.post(
        "/register",
        {
            schema: authSchema(
                users,
                ["email", "password", "username"],
                ["user_uid", "datetime"]
            ),
        },
        async function (request, reply) {
            let { email, password, username } = request.body

            const obj = await fastify.pg.transact(async (client) => {
                password = await fastify.bcrypt.hash(password)

                const { rows } = await client.query(
                    fastify
                        .q()
                        .model({ model: "users" })
                        .insert({ email, password, username })
                        .returning()
                        .eval(";")
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
            schema: authSchema(
                users,
                ["email", "password"],
                ["user_uid", "datetime", "username"]
            ),
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
                        .eval(";")
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
