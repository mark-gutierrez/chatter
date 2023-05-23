module.exports = function (fastify, opts, done) {
    ;(async () => {
        const db = await fastify.file("db.sql")
        // const dropTables =
        //     "DROP TABLE messages; DROP TABLE user_conversation; DROP TABLE conversations; DROP TABLE users;"

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
