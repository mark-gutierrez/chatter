module.exports = function (fastify, opts, done) {
    fastify.post("/register", async function (request, reply) {
        let { email, password, username } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const user = await client.query(
                `SELECT * FROM users WHERE email = '${email}';`
            )
            if (user.rows.length > 0) return []

            password = await fastify.bcrypt.hash(password)

            const { rows } = await client.query(
                `INSERT INTO users(user_uid, email, password, username, datetime) VALUES (uuid_generate_v4(), '${email}', '${password}', '${username}', now()) RETURNING *;`
            )

            return rows
        })

        if (obj.length === 0) {
            reply.code(409).send({ error: "email account already exists" })
        } else {
            reply.code(201).send({ data: obj })
        }
    })

    fastify.post("/login", async function (request, reply) {
        let { email, password } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const user = await client.query(
                `SELECT * FROM users WHERE email = '${email}';`
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
            request.session.user = obj[0]
            reply.code(200).send({ data: obj })
        }
    })

    done()
}
