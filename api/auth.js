const { users } = require("../schemas/models")
const { authSchema } = require("../schemas/routes")
const Query = require("../services/query")
const query = new Query()

module.exports = function (fastify, opts, done) {
    fastify.post(
        "/register",
        {
            schema: authSchema(
                users,
                ["email", "password", "username"],
                ["user_uid", "datetime", "username"]
            ),
        },
        async function (request, reply) {
            let { email, password, username } = request.body

            const obj = await fastify.pg.transact(async (client) => {
                const user = await client.query(
                    query.model("users").find({ email }).eval()
                )
                if (user.rows.length > 0) return []

                password = await fastify.bcrypt.hash(password)

                const { rows } = await client.query(
                    query
                        .model("users")
                        .insert({ email, password, username })
                        .returning()
                        .eval()
                )

                return rows
            })

            if (obj.length === 0) {
                reply.code(409).send({ error: "email account already exists" })
            } else {
                reply.code(201).send({
                    ...obj[0],
                    token: "Bearer " + fastify.jwt.sign(obj[0]),
                })
            }
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
                const user = await client.query(
                    query.model("users").find({ email }).eval()
                )

                if (user.rows.length === 0) return []

                const match = await fastify.bcrypt.compare(
                    password,
                    user.rows[0].password
                )

                if (match) {
                    return user.rows
                }
                return []
            })

            if (obj.length === 0) {
                reply.code(401).send({ error: "Invalid Login Credentials" })
            } else {
                reply.code(200).send({
                    ...obj[0],
                    token: "Bearer " + fastify.jwt.sign(obj[0]),
                })
            }
        }
    )

    done()
}
