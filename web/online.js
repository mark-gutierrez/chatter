const { randomUUID } = require("node:crypto")

module.exports = function (fastify, opts, done) {
    fastify.post("/logout", async function (request, reply) {
        if (request.session.user) {
            request.session.destroy()
            return reply.send({ loggedOut: true })
        } else {
            return reply.send({ loggedOut: false })
        }
    })

    fastify.route({
        method: "GET",
        url: "/",
        handler: async function (request, reply) {
            let home = ""

            if (request.session.user) {
                home = await fastify.file("views/chatter.html")
            } else {
                home = await fastify.file("views/login-registration.html")
            }

            reply.type("text/html").send(home)
        },
        wsHandler: webSocketHandeler,
    })

    const convos = {}

    function webSocketHandeler(conn, req) {
        conn.setEncoding("utf8")

        conn.socket.on("message", async function (message) {
            const { type, data } = await JSON.parse(message.toString())
            const { user_uid, username } = req.session?.user

            if (type === "init") {
                const userConvos = await dbRequest({
                    query: getAllUserConvos({ user_uid }),
                })
                await joinConvos({ socket: conn.socket, user_uid, userConvos })
                const userMessages = await dbRequest({
                    query: getAllMessagesForUser({ user_uid }),
                })
                conn.socket.send(
                    JSON.stringify({
                        type,
                        username: `${username}`,
                        userConvos,
                        userMessages,
                    })
                )
            }

            if (type === "sendMessage") {
                const { conversation_uid, text } = data
                const message_uid = randomUUID()
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
                            },
                        })
                    )
                })
                await dbRequest({
                    query: sendMessage({
                        user_uid,
                        conversation_uid,
                        text,
                        message_uid,
                    }),
                })
            }

            if (type === "searchUser") {
                const users = await dbRequest({
                    query: getUsersWithoutConvoWith({
                        user_uid,
                        data,
                    }),
                })

                conn.socket.send(
                    JSON.stringify({
                        type,
                        users,
                    })
                )
            }

            if (type === "addNewChatter") {
                const newConvo = await dbRequest({
                    query: createConvo({ user_uid, user_uid1: data.user_uid }),
                })

                conn.socket.send(
                    JSON.stringify({
                        type,
                        newConvo,
                    })
                )

                convos[data.user_uid]?.send(
                    JSON.stringify({
                        type,
                        newConvo: [
                            {
                                conversation_uid: newConvo[0].conversation_uid,
                                username: req.session?.user?.username,
                            },
                        ],
                    })
                )
            }

            if (type === "addNewConvo") {
                convos[data] = convos[data] || {}
                convos[data][user_uid] = conn.socket
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

    async function joinConvos({ socket, user_uid = "", userConvos = [] }) {
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

    async function dbRequest({ query = "" }) {
        const client = await fastify.pg.connect()
        let data = ""
        try {
            data = await client.query(query)
        } finally {
            client.release()
        }
        return data?.rows
    }

    function getAllUserConvos({ user_uid = "" }) {
        return `
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
        `
    }

    function getAllMessagesForUser({ user_uid = "" }) {
        return `
        SELECT d.message_uid, d.conversation_uid, d.user_uid, d.text, e.username 
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
        ORDER BY d.datetime;
        `
    }

    function getUsersWithoutConvoWith({ user_uid = "", data = "" }) {
        return `
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
        ) AND user_uid != '${user_uid}' ${
            data !== "" ? `AND username LIKE '%${data}%'` : ""
        }
        `
    }

    function sendMessage({
        user_uid = "",
        conversation_uid = "",
        text = "",
        message_uid = "",
    }) {
        return `
        INSERT INTO messages 
        (user_uid, conversation_uid, text, message_uid) 
        values 
        ('${user_uid}', '${conversation_uid}', '${text.replace(
            "'",
            "''"
        )}', '${message_uid}')
        RETURNING *
        `
    }

    function createConvo({ user_uid = "", user_uid1 = "" }) {
        return `
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
            SELECT '${user_uid1}', conversation_uid
            FROM Create_Convo 
            RETURNING *
        )
        SELECT b.username, a.conversation_uid 
        FROM Second_User as a
        JOIN users as b
        ON a.user_uid = b.user_uid
        `
    }

    done()
}

// wss.on("connection", (socket) => {
//     const uuid = "gfnhjdkbfhjds" // create here a uuid for this connection

//     const leave = (room) => {
//         // not present: do nothing
//         if (!rooms[room][uuid]) return

//         // if the one exiting is the last one, destroy the room
//         if (Object.keys(rooms[room]).length === 1) delete rooms[room]
//         // otherwise simply leave the room
//         else delete rooms[room][uuid]
//     }

//     socket.on("message", (data) => {
//         const { message, meta, room } = data

//         if (meta === "join") {
//             if (!rooms[room]) rooms[room] = {} // create the room
//             if (!rooms[room][uuid]) rooms[room][uuid] = socket // join the room
//         } else if (meta === "leave") {
//             leave(room)
//         } else if (!meta) {
//             // send the message to all in the room
//             Object.entries(rooms[room]).forEach(([, sock]) =>
//                 sock.send({ message })
//             )
//         }
//     })

//     socket.on("close", () => {
//         // for each room, remove the closed socket
//         Object.keys(rooms).forEach((room) => leave(room))
//     })
// })
