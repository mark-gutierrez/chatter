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
        wsHandler: webSocketHandeler,
    })

    async function getConvos(user_uid) {
        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({
                        model: fastify
                            .q()
                            .model({ model: "user_conversation" })
                            .select({ user_conversation: ["conversation_uid"] })
                            .where({ user_conversation: { user_uid } }),
                        as: "a",
                    })
                    .join({
                        model: "user_conversation",
                        as: "b",
                        field: "conversation_uid",
                        joinTable: "a",
                    })
                    .join({
                        model: "users",
                        as: "c",
                        field: "user_uid",
                        joinTable: "b",
                    })
                    .select({
                        b: ["conversation_uid"],
                        c: ["user_uid", "username"],
                    })
                    .where({
                        b: { user_uid: `$NOT$${user_uid}` },
                    })
                    .eval()
            )
            return rows
        })

        return obj
    }

    async function getMessages(conversation_uid) {
        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({
                        model: fastify
                            .q()
                            .model({ model: "messages" })
                            .select()
                            .where({ messages: { conversation_uid } }),
                        as: "a",
                    })
                    .join({
                        model: "users",
                        as: "b",
                        field: "user_uid",
                        joinTable: "a",
                    })
                    .select({
                        a: ["text", "message_uid", "datetime"],
                        b: ["username", "user_uid"],
                    })
                    .sort({ a: ["datetime"] })
                    .eval()
            )
            return rows
        })

        return obj
    }

    async function sendMessage({ user_uid, conversation_uid, text }) {
        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({
                        model: "messages",
                    })
                    .insert({ items: [{ user_uid, conversation_uid, text }] })
                    .returning()
                    .eval()
            )
            return rows[0]
        })

        return obj
    }

    const convos = {}

    async function joinConvos({ socket, user_uid = "", userConvos = [] }) {
        userConvos.forEach(({ conversation_uid }) => {
            convos[conversation_uid] = convos[conversation_uid] || {}
            convos[conversation_uid][user_uid] = socket
        })
    }

    function leave(convo, user_uid) {
        if (!convos[convo][user_uid]) return

        // if the one exiting is the last one, destroy the room
        if (Object.keys(convos[convo]).length === 1) delete convos[convo]
        // otherwise simply leave the room
        else delete convos[convo][user_uid]
    }

    function webSocketHandeler(conn, req) {
        conn.setEncoding("utf8")

        conn.socket.on("message", async (message) => {
            const { type, data } = await JSON.parse(message.toString())
            const { user_uid, username, email } = req.session?.user

            if (type === "init") {
                const userConvos = await getConvos(user_uid)
                await joinConvos({ socket: conn.socket, user_uid, userConvos })

                conn.socket.send(
                    JSON.stringify({
                        type,
                        username: `${username}`,
                        userConvos,
                    })
                )
            }

            if (type === "getMessages") {
                const messages = await getMessages(data)
                conn.socket.send(JSON.stringify({ type, messages }))
            }

            if (type === "sendMessage") {
                const { conversation_uid, text } = data
                const message = await sendMessage({
                    user_uid,
                    conversation_uid,
                    text,
                })

                Object.entries(convos[conversation_uid]).forEach(([, sock]) => {
                    sock.send(
                        JSON.stringify({
                            type,
                            message: { ...message, username },
                        })
                    )
                })
            }
        })
        conn.socket.on("close", (code, reason) => {
            console.log(`${req.session.user.username} left the server`)
            Object.keys(convos).forEach((convo) =>
                leave(convo, req.session?.user?.user_uid)
            )
        })
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
