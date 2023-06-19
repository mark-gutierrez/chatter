module.exports = function (fastify, opts, done) {
    ;(async () => {
        // const dropTables =
        //     "DROP TABLE messages; DROP TABLE user_conversation; DROP TABLE conversations; DROP TABLE users;"

        const client = await fastify.pg.connect()
        let db
        try {
            db = await require("node:fs").promises.open(
                require("node:path").join(__dirname, "..", "public", "db.sql")
            )
            const query = await db.readFile()
            await client.query(query.toString())
            const query1 = await dummyUsers()
            await client.query(query1)
        } catch (err) {
            console.error("error executing query:", err)
        } finally {
            client.end()
            db.close()
        }
    })()

    async function dummyUsers() {
        let query = `INSERT INTO users (email, password, username, verified) VALUES `
        password = await fastify.bcrypt.hash("User1234!")
        let list = []
        for (let i = 1; i < 21; i++) {
            list.push(
                `('user${i}@yopmail.com', '${password}', 'user${i}', 'true')`
            )
        }
        return query + list.join(", ") + " ON CONFLICT DO NOTHING"
    }

    done()
}
