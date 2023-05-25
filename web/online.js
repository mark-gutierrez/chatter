module.exports = function (fastify, opts, done) {
    fastify.route({
        method: "GET",
        url: "/",
        handler: async (request, reply) => {
            let home = ""

            if (request.session.user) {
                home = await fastify.file("views/chatter.html")
            } else {
                home = await fastify.file("views/login-registration.html")
            }

            reply.type("text/html").send(home)
        },
        wsHandler: (conn, req) => {
            conn.setEncoding("utf8")

            conn.socket.on("message", async (message) => {
                const { type, data } = await JSON.parse(message.toString())
                const { user_uid, username, email } = req.session?.user
                if (type === "init") {
                    conn.socket.send(
                        JSON.stringify({
                            username: `${username}`,
                        })
                    )
                }
            })
            conn.socket.on("close", (code, reason) => {
                console.log(`${req.session.user.username} left the server`)
            })
        },
    })

    fastify.post("/create_conversation", async function (request, reply) {
        if (!(request.headers?.authorization || request.session?.user)) {
            reply.code(401).send({ error: "Unauthorized request" })
        }

        let obj = {}
        if (request.headers?.authorization) {
            obj = fastify.jwt.decode(
                request.headers?.authorization?.replace("Bearer ", "")
            )
        }
        if (request.session?.user) {
            obj = request.session.user
        }

        const { user_uid } = request.body

        const result = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({ model: "users" })
                    .select({ users: { email } })
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
        reply.send({ ok: true })
    })

    done()
}
