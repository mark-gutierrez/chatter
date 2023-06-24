module.exports = function (fastify, opts, done) {
    function in5mins(time) {
        const now = new Date()
        const dbtime = new Date(time)
        const diff = new Date(now - dbtime).getMinutes()
        return diff <= 5
    }

    fastify.post(
        "/register",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email", "password", "username"],
                    additionalProperties: false,
                    properties: {
                        email: { type: "string", format: "email" },
                        password: {
                            type: "string",
                            pattern:
                                "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                        },
                        username: { type: "string", minLength: 1 },
                    },
                },
            },
        },
        async function (request, reply) {
            let { email, password, username } = request.body

            const { user_uid } = await fastify.pg.transact(async (client) => {
                const user = await client.query(
                    `SELECT users.last_email, users.verified 
                FROM users 
                WHERE users.email = $1`,
                    [email]
                )

                if (user.rows.length > 0) {
                    const { last_email, verified } = user.rows[0]
                    if (verified) throw new Error(`${email} already exists`)
                    if (in5mins(last_email))
                        throw new Error(
                            `Email to verify account was already sent. Please wait 5 mins before requesting again`
                        )
                    const registration = await client.query(
                        `UPDATE users
                    SET last_email = 'now()'
                    WHERE users.email = $1
                    RETURNING users.user_uid`,
                        [email]
                    )
                    return registration.rows[0]
                }

                password = await fastify.bcrypt.hash(password)
                const { rows } = await client.query(
                    `INSERT INTO 
                users (email, password, username) 
                VALUES ($1, $2, $3) 
                RETURNING users.user_uid`,
                    [email, password, username]
                )
                return rows[0]
            })

            await fastify.email({
                to: email,
                subject: "Verify Chatter Account",
                user_uid,
            })

            reply.code(201).send({
                data: `Successfully sent verification email to ${email}`,
            })
        }
    )

    fastify.get(
        "/verify-account/:user_uid",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["user_uid"],
                    additionalProperties: false,
                    properties: {
                        user_uid: { type: "string", format: "uuid" },
                    },
                },
            },
        },
        async function (request, reply) {
            const { user_uid } = request.params

            const { email } = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    `SELECT users.last_email, users.verified 
                FROM users 
                WHERE users.user_uid = $1`,
                    [user_uid]
                )

                if (rows.length === 0) return reply.callNotFound()
                const { last_email, verified } = rows[0]
                if (verified) throw new Error(`User already verified`)
                if (!in5mins(last_email))
                    throw new Error(`Email verification link expired`)

                const user = await client.query(
                    `UPDATE users
                SET verified = true
                WHERE users.user_uid = $1
                RETURNING users.email`,
                    [user_uid]
                )

                return user.rows[0]
            })

            reply.code(303).redirect(`/?success-verification=${email}`)
        }
    )

    fastify.post(
        "/login",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email", "password"],
                    additionalProperties: false,
                    properties: {
                        email: { type: "string", format: "email" },
                        password: {
                            type: "string",
                            pattern:
                                "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                        },
                    },
                },
            },
        },
        async function (request, reply) {
            let { email, password } = request.body

            const obj = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    `SELECT users.user_uid, users.username, users.password, users.verified 
                    FROM users 
                    WHERE users.email = $1`,
                    [email]
                )

                if (rows.length === 0)
                    throw new Error(`Invalid Login Credentials`)
                return rows[0]
            })

            const match = await fastify.bcrypt.compare(password, obj.password)
            if (!match) throw new Error(`Invalid Login Credentials`)
            if (!obj.verified)
                throw new Error(`${email} account has not yet been verified`)

            request.session.user = obj
            reply
                .code(200)
                .send({
                    data: { user_uid: obj.user_uid, username: obj.username },
                })
        }
    )

    fastify.post(
        "/forgot-password",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email"],
                    additionalProperties: false,
                    properties: {
                        email: { type: "string", format: "email" },
                    },
                },
            },
        },
        async function (request, reply) {
            const { email } = request.body
            const user_uid = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    `SELECT users.verified, users.last_email
                FROM users 
                WHERE users.email = $1`,
                    [email]
                )

                if (rows.length === 0) throw new Error("Email does not exist")
                const { verified, last_email } = rows[0]
                if (!verified) throw new Error("Account is not verified")
                if (in5mins(last_email))
                    throw new Error(
                        `Email to reset password was already sent. Please wait 5 mins before requesting again`
                    )

                const users = await client.query(
                    `UPDATE users
                SET last_email = 'now()' 
                WHERE users.email = $1
                RETURNING users.user_uid`,
                    [email]
                )

                return users.rows[0].user_uid
            })

            await fastify.email({
                to: email,
                subject: "Reset Chatter Password",
                user_uid,
            })

            reply.code(200).send({
                data: `Successfully sent email to ${email} reset password`,
            })
        }
    )

    fastify.post(
        "/reset-password",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["user_uid", "password"],
                    additionalProperties: false,
                    properties: {
                        user_uid: { type: "string", format: "uuid" },
                        password: {
                            type: "string",
                            pattern:
                                "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                        },
                    },
                },
            },
        },
        async function (request, reply) {
            let { user_uid, password } = request.body

            const { email } = await fastify.pg.transact(async (client) => {
                const { rows } = await client.query(
                    `SELECT users.last_email, users.verified 
                FROM users 
                WHERE users.user_uid = $1`,
                    [user_uid]
                )

                if (rows.length === 0) return reply.callNotFound()
                const { last_email, verified } = rows[0]
                if (!verified)
                    throw new Error(
                        `Cannot change password of account that is not verified`
                    )
                if (!in5mins(last_email))
                    throw new Error(`Email reset password link expired`)

                password = await fastify.bcrypt.hash(password)
                const user = await client.query(
                    `UPDATE users
                SET password = $1
                WHERE users.user_uid = $2
                RETURNING users.email`,
                    [password, user_uid]
                )

                return user.rows[0]
            })
            reply.code(200).send({
                data: `Successfully updated password for user ${email}`,
            })
        }
    )

    done()
}
