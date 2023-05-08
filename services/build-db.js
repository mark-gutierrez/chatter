const reader = require("./file-reader")

module.exports = function (fastify, opts, done) {
    ;(async () => {
        const db = await reader("db.sql")
        const client = await fastify.pg.connect()
        try {
            await client.query(db)
        } catch (err) {
            console.error("error executing query:", err)
        } finally {
            client.end()
        }
    })()

    done()
}
