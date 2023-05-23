const { UnauthenticatedError } = require("../errors")

module.exports = function (fastify, opts, done) {
    fastify.post("/register", async function (request, reply) {
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

            return rows
        })

        reply.code(201).send({ data: obj })
    })

    fastify.post("/login", async function (request, reply) {
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
        request.session.user = obj
        reply.code(200).send({ data: obj })
    })

    done()
}
