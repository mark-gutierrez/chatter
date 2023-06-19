module.exports = function (fastify, opts, done) {
    fastify.get(
        "/is-online",
        {
            schema: {
                response: {
                    "2xx": {
                        type: "object",
                        properties: {
                            ok: { type: "boolean" },
                            user_uid: { type: "string" },
                        },
                    },
                },
            },
        },
        async function (request, reply) {
            if (request.session.user) {
                return reply.send({
                    ok: true,
                    user_uid: request.session.user.user_uid,
                })
            } else {
                return reply.send({ ok: false, user_uid: "" })
            }
        }
    )

    fastify.post(
        "/logout",
        {
            schema: {
                response: {
                    "2xx": {
                        type: "object",
                        properties: { loggedOut: { type: "boolean" } },
                    },
                },
            },
        },
        async function (request, reply) {
            request.session.destroy()
            return reply.send({ loggedOut: true })
        }
    )

    fastify.route({
        method: "GET",
        url: "/",
        handler: async function (request, reply) {
            let home = ""
            try {
                home = await require("node:fs").promises.open(
                    require("node:path").join(
                        __dirname,
                        "..",
                        "public",
                        "index.html"
                    )
                )
                const query = await home.readFile()
                page = query.toString()
                return reply.type("text/html").send(page)
            } finally {
                home.close()
            }
        },
        wsHandler: webSocketHandeler,
    })

    const convos = {}
    const { randomUUID } = require("node:crypto")

    function webSocketHandeler(conn, req) {
        conn.setEncoding("utf8")

        conn.socket.on("message", async function (message) {
            const { type, data } = await JSON.parse(message.toString())
            const { user_uid, username } = req.session?.user

            if (type === "init") {
                const userConvos = await db(`
                    SELECT b.conversation_uid, c.username
                    FROM 
                    (
                        SELECT conversation_uid 
                        FROM user_conversation 
                        WHERE user_uid = '${user_uid}'
                    ) as a
                    JOIN user_conversation as b 
                    ON a.conversation_uid = b.conversation_uid
                    JOIN users as c
                    ON b.user_uid = c.user_uid
                    WHERE b.user_uid != '${user_uid}'
                `)

                join({ socket: conn.socket, user_uid, userConvos })

                const userMessages = await db(`
                    SELECT d.message_uid, d.conversation_uid, d.user_uid, d.datetime, d.text, e.username 
                    FROM 
                    (
                        SELECT b.conversation_uid
                        FROM 
                        (
                            SELECT conversation_uid 
                            FROM user_conversation 
                            WHERE user_uid = '${user_uid}'
                        ) as a
                        JOIN user_conversation as b 
                        ON a.conversation_uid = b.conversation_uid
                        WHERE b.user_uid != '${user_uid}'
                    ) as c
                    JOIN messages as d
                    ON c.conversation_uid = d.conversation_uid
                    JOIN users as e
                    ON d.user_uid = e.user_uid
                    ${data !== "" ? `WHERE d.datetime > '${data}'` : ""}
                    ORDER BY d.datetime
                `)

                send(conn.socket, {
                    type,
                    username,
                    userConvos,
                    userMessages,
                    user_uid,
                })
            }

            if (type === "search") {
                const users = await db(`
                    SELECT user_uid, username  
                    FROM users
                    WHERE user_uid NOT IN 
                    (
                        SELECT b.user_uid
                        FROM 
                        (
                            SELECT conversation_uid 
                            FROM user_conversation 
                            WHERE user_uid = '${user_uid}'
                        ) as a
                        JOIN user_conversation as b 
                        ON a.conversation_uid = b.conversation_uid
                        WHERE b.user_uid != '${user_uid}'
                    ) AND user_uid != '${user_uid}' AND verified = 'true' ${
                    data !== "" ? `AND username LIKE '%${data}%'` : ""
                }`)

                send(conn.socket, { type, users })
            }

            if (type === "add") {
                const newChatter = await db(`
                    with
                    Create_Convo (conversation_uid) as
                        (
                            INSERT INTO conversations
                            DEFAULT VALUES
                            RETURNING conversation_uid
                        ),
                    First_User (conversation_uid) as
                        (
                            INSERT INTO user_conversation (user_uid, conversation_uid)
                            SELECT '${user_uid}', conversation_uid
                            FROM Create_Convo
                            RETURNING conversation_uid
                        ),
                    Second_User as (
                        INSERT INTO user_conversation (user_uid, conversation_uid)
                        SELECT '${data}', conversation_uid
                        FROM Create_Convo
                        RETURNING *
                    )
                    SELECT b.username, a.conversation_uid
                    FROM Second_User as a
                    JOIN users as b
                    ON a.user_uid = b.user_uid
                `)
                send(conn.socket, { type, newChatter: newChatter[0] })

                convos[data]?.send(
                    JSON.stringify({
                        type,
                        newChatter: {
                            conversation_uid: newChatter[0].conversation_uid,
                            username: req.session?.user?.username,
                        },
                    })
                )
            }

            if (type === "addConvo") {
                convos[data] = convos[data] || {}
                convos[data][user_uid] = conn.socket
            }

            if (type === "message") {
                const { conversation_uid, text } = data
                const message_uid = randomUUID()
                const datetime = new Date(Date.now()).toISOString()
                Object.entries(convos[conversation_uid]).forEach(([, sock]) => {
                    sock.send(
                        JSON.stringify({
                            type,
                            message: {
                                user_uid,
                                conversation_uid,
                                text,
                                username,
                                message_uid,
                                datetime,
                            },
                        })
                    )
                })
                await db(`
                    INSERT INTO messages
                    (user_uid, conversation_uid, text, message_uid, datetime)
                    values
                    ('${user_uid}', '${conversation_uid}', '${text.replace(
                    "'",
                    "''"
                )}', '${message_uid}', '${datetime}')
                `)
            }
        })

        conn.socket.on("close", (code, reason) => {
            console.log(`${req.session.user.username} left the server`)
            Object.keys(convos).forEach((convo) =>
                leave(convo, req.session?.user?.user_uid)
            )
            delete convos[req.session?.user?.user_uid]
        })
    }

    function join({ socket, user_uid = "", userConvos = [] }) {
        for (let i = 0; i < userConvos.length; i++) {
            const { conversation_uid } = userConvos[i]
            convos[conversation_uid] = convos[conversation_uid] || {}
            convos[conversation_uid][user_uid] = socket
        }
        convos[user_uid] = socket
    }

    function leave(convo, user_uid) {
        if (!convos[convo][user_uid]) return
        if (Object.keys(convos[convo]).length === 1) delete convos[convo]
        else delete convos[convo][user_uid]
    }

    function send(socket, object = {}) {
        socket.send(JSON.stringify(object))
    }

    async function db(query = "") {
        const client = await fastify.pg.connect()
        let data = ""
        try {
            data = await client.query(query)
        } finally {
            client.release()
        }
        return data?.rows
    }

    done()
}
