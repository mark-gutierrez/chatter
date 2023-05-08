const reader = require("../services/file-reader")

module.exports = function (fastify, opts, done) {
    fastify.route({
        method: "GET",
        url: "/",
        handler: async (request, reply) => {
            let home = ""

            if (request.session.user) {
                home = await reader("chatter.html")
            } else {
                home = await reader("login-registration.html")
            }

            reply.type("text/html").send(home)
        },
        wsHandler: (conn, req) => {
            conn.setEncoding("utf8")
            conn.socket.send(
                JSON.stringify({ username: `${req.session.user.username}` })
            )

            conn.socket.on("message", async (message) => {
                const { type, data } = JSON.parse(message)
                const { user_uid, username, email } = req.session?.user
                if (type === "init") {
                    const client = await fastify.pg.connect()
                    try {
                        const { rows } = await client.query(
                            Query.get().build(request)
                        )
                        return reply.send({ data: rows })
                    } finally {
                        client.release()
                    }
                }
            })
            conn.socket.on("close", (code, reason) => {
                console.log(`${req.session.user.username} left the server`)
            })
        },
    })

    done()
}
