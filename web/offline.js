const { UnauthenticatedError, BadRequestError } = require("../errors")

module.exports = function (fastify, opts, done) {
    fastify.post("/register", async function (request, reply) {
        let { email, password, username } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({ model: "users" })
                    .select()
                    .where({ users: { email } })
                    .eval()
            )

            if (rows.length > 0)
                throw new BadRequestError(
                    "User is already existing and is validated"
                )

            const registrationCheck = await client.query(
                fastify
                    .q()
                    .model({ model: "registrations" })
                    .select()
                    .where({ registrations: { email } })
                    .eval()
            )

            if (registrationCheck.rows.length > 0) {
                const now = new Date()
                const dbtime = new Date(registrationCheck.rows[0].datetime)
                const diff = new Date(now - dbtime).getMinutes()
                if (diff <= 5)
                    throw new BadRequestError(
                        "Email to verify account was already sent. Please wait 5 mins before requesting again"
                    )

                const registration = await client.query(
                    fastify
                        .q()
                        .model({ model: "registrations" })
                        .update({ datetime: "now()" })
                        .where({
                            registrations: {
                                registration_uid:
                                    registrationCheck.rows[0].registration_uid,
                            },
                        })
                        .returning()
                        .eval()
                )

                return registration.rows[0]
            }

            password = await fastify.bcrypt.hash(password)

            const registration = await client.query(
                fastify
                    .q()
                    .model({ model: "registrations" })
                    .insert({ items: [{ email, password, username }] })
                    .returning()
                    .eval()
            )

            return registration.rows[0]
        })

        let mail = await fastify.file("mail/verify-account.html")
        mail = mail.replace(
            "{{link}}",
            `${
                fastify.config.ENV === "DEV"
                    ? `http://localhost:${fastify.config.PORT}/`
                    : `${fastify.config.WEBSITE}`
            }verify-account/${obj.registration_uid}`
        )

        await fastify.mail({
            to: email,
            subject: "Verify Chatter Account",
            text: "Do not send to anyone",
            html: mail,
        })

        reply.code(201).send({ data: obj })
    })

    fastify.get(
        "/verify-account/:registration_uid",
        async function (request, reply) {
            const { registration_uid } = request.params

            const obj = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    fastify
                        .q()
                        .model({ model: "registrations" })
                        .delete()
                        .where({ registrations: { registration_uid } })
                        .returning()
                        .eval()
                )

                if (rows.length === 0) return reply.callNotFound()

                const { email, password, username } = rows[0]

                const user = await client.query(
                    fastify
                        .q()
                        .model({ model: "users" })
                        .insert({ items: [{ email, password, username }] })
                        .returning()
                        .eval()
                )

                return user.rows[0]
            })

            let webpage = await fastify.file("views/verify-account.html")
            webpage = webpage.replace("{{email}}", obj.email)

            reply.type("text/html").send(webpage)
        }
    )

    fastify.post("/login", async function (request, reply) {
        let { email, password } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({ model: "users" })
                    .select()
                    .where({ users: { email } })
                    .eval()
            )

            if (rows.length === 0)
                throw new UnauthenticatedError(`Invalid Login Credentials`)

            return rows[0]
        })
        const match = await fastify.bcrypt.compare(password, obj.password)
        if (!match) throw new UnauthenticatedError(`Invalid Login Credentials`)

        request.session.user = obj
        reply.code(200).send({ data: obj })
    })

    fastify.post("/forgot-password", async function (request, reply) {
        const { email } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({ model: "users" })
                    .select()
                    .where({ users: { email } })
                    .eval()
            )

            if (rows.length === 0)
                throw new UnauthenticatedError("Email does not exist")

            const forgot_password_check = await client.query(
                fastify
                    .q()
                    .model({ model: "forgot_password" })
                    .select()
                    .where({ forgot_password: { user_uid: rows[0].user_uid } })
                    .eval()
            )

            if (forgot_password_check.rows.length > 0) {
                const now = new Date()
                const dbtime = new Date(forgot_password_check.rows[0].datetime)
                const diff = new Date(now - dbtime).getMinutes()
                if (diff <= 5)
                    throw new BadRequestError(
                        "Email to reset password was already sent. Please wait 5 mins before requesting again"
                    )

                const forgot_password = await client.query(
                    fastify
                        .q()
                        .model({ model: "forgot_password" })
                        .update({ datetime: "now()" })
                        .where({
                            forgot_password: {
                                forgot_password_uid:
                                    forgot_password_check.rows[0]
                                        .forgot_password_uid,
                            },
                        })
                        .returning()
                        .eval()
                )

                return forgot_password.rows[0]
            }

            const forgot_password = await client.query(
                fastify
                    .q()
                    .model({ model: "forgot_password" })
                    .insert({ items: [{ user_uid: rows[0].user_uid }] })
                    .returning()
                    .eval()
            )

            return forgot_password.rows[0]
        })

        let mail = await fastify.file("mail/forgot-password.html")
        mail = mail.replace(
            "{{link}}",
            `${
                fastify.config.ENV === "DEV"
                    ? `http://localhost:${fastify.config.PORT}/`
                    : `${fastify.config.WEBSITE}`
            }reset-password/${obj.forgot_password_uid}/${obj.user_uid}`
        )

        await fastify.mail({
            to: email,
            subject: "Reset Chatter Password",
            text: "Do not send to anyone",
            html: mail,
        })

        reply.send({ data: true })
    })

    fastify.get(
        "/reset-password/:forgot_password_uid/:user_uid",
        async function (request, reply) {
            const { forgot_password_uid, user_uid } = request.params

            const obj = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    fastify
                        .q()
                        .model({
                            model: fastify
                                .q()
                                .model({ model: "forgot_password" })
                                .select()
                                .where({
                                    forgot_password: {
                                        forgot_password_uid,
                                        user_uid,
                                    },
                                }),
                            as: "a",
                        })
                        .join({
                            model: "users",
                            as: "b",
                            field: "user_uid",
                            joinTable: "a",
                        })
                        .select({
                            a: ["user_uid", "forgot_password_uid"],
                            b: ["email"],
                        })
                        .eval()
                )

                if (rows.length === 0) return reply.callNotFound()

                return rows[0]
            })

            let resetPassword = await fastify.file("views/reset-password.html")

            resetPassword = resetPassword
                .replace("{{email}}", obj.email)
                .replace("{{forgot_password_uid}}", obj.forgot_password_uid)
                .replace("{{user_uid}}", obj.user_uid)

            return reply.type("text/html").send(resetPassword)
        }
    )

    fastify.post("/reset-password", async function (request, reply) {
        let { forgot_password_uid, user_uid, password } = request.body

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                fastify
                    .q()
                    .model({ model: "forgot_password" })
                    .delete()
                    .where({
                        forgot_password: {
                            forgot_password_uid,
                            user_uid,
                        },
                    })
                    .returning()
                    .eval()
            )

            if (rows.length === 0) throw new BadRequestError(`No DB Entry`)

            password = await fastify.bcrypt.hash(password)

            const users = await client.query(
                fastify
                    .q()
                    .model({ model: "users" })
                    .update({ password })
                    .where({
                        users: {
                            user_uid,
                        },
                    })
                    .returning()
                    .eval()
            )

            if (users.rows.length === 0)
                throw new BadRequestError(`Failed to Update Password`)

            return users.rows[0]
        })

        return reply.send({ data: true })
    })

    done()
}
