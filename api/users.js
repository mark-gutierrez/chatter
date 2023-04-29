module.exports = function (fastify, opts, done) {
    fastify.get("/", async function (request, reply) {
        // const client = await fastify.pg.connect()
        // try {
        //     const { rows } = await client.query("SELECT * FROM users;")

        //     return rows
        // } finally {
        //     client.release()
        // }
        const { query, body, method, url, routerPath } = request
        console.log({ query, body, method, url, routerPath })

        return { ok: true }
    })

    fastify.post("/", async function (request, reply) {
        // const client = await fastify.pg.connect()
        // const {
        //     body: { email, password, username },
        // } = request

        // try {
        //     const { rows } = await client.query(
        //         `INSERT into users (user_uid, email, password, username, datetime) values (uuid_generate_v4() ,'${email}','${password}','${username}', now());`
        //     )
        //     return rows
        // } finally {
        //     client.release()
        // }
        const { query, body, method, url, routerPath } = request
        console.log({ query, body, method, url, routerPath })

        return { ok: true }
    })

    done()
}
