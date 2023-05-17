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

    done()
}
