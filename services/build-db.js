const user_uid1 = "805a4fdf-17c5-4410-b8f0-09a0c9852c7e"
const user_uid2 = "74e0c87d-62b5-4f78-a968-c84181086562"
const checkIfConversationExists = (user_uid1, user_uid2) => `
SELECT * 
FROM (SELECT * 
FROM user_conversation 
WHERE user_uid = '${user_uid1}') as a
JOIN user_conversation as b
ON a.conversation_uid = b.conversation_uid 
WHERE b.user_uid = '${user_uid2}'
`

const createConversation = `
with 
Create_Convo (conversation_uid) as 
    (INSERT INTO conversations 
    DEFAULT VALUES 
    RETURNING conversation_uid),
First_User (conversation_uid) as 
    (INSERT INTO user_conversation (user_uid, conversation_uid) 
    SELECT '${user_uid1}', conversation_uid 
    FROM Create_Convo 
    RETURNING conversation_uid)
INSERT INTO user_conversation (user_uid, conversation_uid) 
SELECT '${user_uid2}', conversation_uid
FROM Create_Convo 
WHERE NOT EXISTS (
    ${checkIfConversationExists(user_uid1, user_uid2)}
) RETURNING *;
`

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
