module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    fastify.addHook("onRequest", async (request, reply) => {
        const token = request.headers.authorization
        const { user_uid } = fastify.jwt.decode(token.replace("Bearer ", ""))

        request.user_uid = user_uid
    })

    // Messages route
    fastify.get("/my-convos", async function (request, reply) {
        const user_uid = request?.user_uid

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

        reply.send({ data: obj ?? [] })
    })

    fastify.get("/convo/:id", async function (request, reply) {
        const { id } = request.params

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({
                        model: fastify
                            .q()
                            .model({ model: "messages" })
                            .select()
                            .where({ messages: { conversation_uid: id } }),
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

        for (let i = 0; i < obj.length; i++) {
            const { user_uid } = obj[i]
            if (request?.user_uid === user_uid)
                return reply.send({ data: obj ?? [] })
        }

        return reply.code(401).send({ error: `Unauthorized` })
    })

    fastify.post("/create-convo", async function (request, reply) {
        const user_uid1 = request?.user_uid
        const { user_uid: user_uid2 } = request.body

        //  CHECKS IF CONVO EXISTS BETWEEN TWO USERS
        const convoExists = fastify
            .q()
            .model({
                model: fastify
                    .q()
                    .model({ model: "user_conversation" })
                    .select()
                    .where({ user_conversation: { user_uid: user_uid1 } }),
                as: "a",
            })
            .join({
                model: "user_conversation",
                as: "b",
                field: "conversation_uid",
                joinTable: "a",
            })
            .select({})
            .where({ b: { user_uid: user_uid2 } })

        // CREATE CONVERSATION INSTANCE
        const firstWith = fastify
            .q()
            .model({ model: "conversations" })
            .insert()
            .returning()

        // INSERT FIRST USER INTO THE CONVERSATION
        const secondWith = fastify
            .q()
            .model({ model: "user_conversation" })
            .insert({
                items: fastify.q({
                    model: "Create_Convo",
                    custom: true,
                    select: { any: [`'${user_uid1}'`, "conversation_uid"] },
                }),
            })
            .returning()

        // INSERT SECOND USER INTO THE CONVEVRSATION
        const finalwith = fastify
            .q()
            .model({ model: "user_conversation" })
            .insert({
                items: fastify.q({
                    model: "Create_Convo",
                    custom: true,
                    select: { any: [`'${user_uid2}'`, "conversation_uid"] },
                    where: { not_exists: convoExists },
                }),
            })
            .returning()

        const obj = await fastify.pg.transact(async (client) => {
            //  THIS CREATES CONVERSATION IF IT DOES NOT EXIST
            const { rows } = await client.query(
                fastify
                    .q()
                    .with({ subquery: firstWith, name: "Create_Convo" })
                    .with({ subquery: secondWith, name: "First_User" })
                    .with({ subquery: finalwith, name: "last" })
                    .eval()
            )
            return rows
        })

        if (obj.length > 0) {
            return reply.send({ data: obj })
        } else {
            return reply
                .code(400)
                .send({ error: `Conversation with user already exists` })
        }
    })

    done()
}
