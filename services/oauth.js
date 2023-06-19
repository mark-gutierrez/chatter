module.exports = function (fastify, opts, done) {
    const oauthPlugin = require("@fastify/oauth2")

    fastify.register(oauthPlugin, {
        name: "googleOAuth2",
        scope: ["profile", "email"],
        credentials: {
            client: {
                id: process.env.ABC_ID,
                secret: process.env.ABC_SECRET,
            },
            auth: oauthPlugin.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: "/login/google",
        callbackUri: `${process.env.WEBSITE}/login/google/callback`,
        callbackUriParams: {
            access_type: "offline",
        },
    })

    fastify.get("/login/google/callback", async function (request, reply) {
        const { token } =
            await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
                request
            )

        const userData = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                },
            }
        ).then((res) => res.json())

        const obj = await fastify.pg.transact(async (client) => {
            const { rows } = await client.query(
                `SELECT users.user_uid, users.username, users.verified
                FROM users 
                WHERE users.email = $1`,
                [userData.email]
            )

            if (rows[0]?.verified === true) return rows[0]

            if (
                userData.email_verified === false &&
                rows[0]?.verified === false
            ) {
                throw new Error("Google Account is not a verified email")
            }

            if (rows[0]?.verified === false) {
                const user = await client.query(
                    `UPDATE users 
                    SET verified = 'true'
                    WHERE users.email = $1
                    RETURNING users.user_uid, users.username
                    `,
                    [userData.email]
                )
                return user.rows[0]
            }

            const user = await client.query(
                `INSERT INTO 
                users (email, password, username, verified) 
                VALUES ($1, $2, $3, $4) 
                RETURNING users.user_uid, users.username
                `,
                [userData.email, "default", userData.name, "true"]
            )

            return user.rows[0]
        })

        request.session.user = obj
        reply.code(301).redirect("/")
    })

    fastify.register(oauthPlugin, {
        name: "githubOAuth2",
        scope: ["read:user", "user:email"],
        credentials: {
            client: {
                id: process.env.GITHUB_ID,
                secret: process.env.GITHUB_SECRET,
            },
            auth: oauthPlugin.GITHUB_CONFIGURATION,
        },
        startRedirectPath: "/login/github",
        callbackUri: "http://localhost:3000/login/github/callback",
    })

    fastify.get("/login/github/callback", async function (request, reply) {
        const { token } =
            await this.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(
                request
            )
        const user = await fetch(`https://api.github.com/user`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }).then((res) => res.json())

        console.log(user)

        const obj = await fastify.pg.transact(async (client) => {
            const email = user.email ?? user.id

            const { rows } = await client.query(
                `SELECT users.user_uid, users.username
                FROM users 
                WHERE users.email = $1`,
                [email]
            )

            if (rows.length > 0) return rows[0]

            const users = await client.query(
                `INSERT INTO 
                users (email, password, username, verified) 
                VALUES ($1, $2, $3, $4) 
                RETURNING users.user_uid, users.username
                `,
                [email, "default", user.login, "true"]
            )

            return users.rows[0]
        })

        request.session.user = obj
        reply.code(301).redirect("/")
    })

    done()
}
