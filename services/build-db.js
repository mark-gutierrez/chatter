const user_uid1 = "805a4fdf-17c5-4410-b8f0-09a0c9852c7e"
const user_uid2 = "e4c7bd04-ab93-4869-9298-6b150c9fc8e1"
const checkIfConversationExists1 = (user_uid1, user_uid2) => `
SELECT * 
FROM (SELECT * 
FROM user_conversation 
WHERE user_uid = '${user_uid1}') as a
JOIN user_conversation as b
ON a.conversation_uid = b.conversation_uid 
WHERE b.user_uid = '${user_uid2}'
`

const createConversation1 = `
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
    ${checkIfConversationExists1(user_uid1, user_uid2)}
) RETURNING *;
`
const q = require("../services/query-builder")

const checkIfConversationExists = q
    .customModel({
        query: q
            .model("user_conversation")
            .find({ user_uid: user_uid1 })
            .eval(),
        name: "a",
        model: "user_conversation",
    })
    .join({
        model: "user_conversation",
        name: "b",
        on: { conversation_uid: ["a", "b"] },
    })
    .customWhere({ table: "b", field: "user_uid", value: `${user_uid2}` })
    .eval()

const createConversationInstance = q
    .model("conversations")
    .insert()
    .returning()
    .eval()
const addUserOneToConversation = q
    .model("user_conversation")
    .insert({
        select: [`'${user_uid1}'`, "conversation_uid"],
        ref: "Create_Convo",
    })
    .returning()
    .eval()

const createConversation = q
    .with({
        name: "Create_Convo",
        model: "conversations",
        query: createConversationInstance,
    })
    .with({
        name: "First_User",
        model: "user_conversation",
        query: addUserOneToConversation,
    })
    .insert({
        model: "user_conversation",
        select: [`'${user_uid2}'`, "conversation_uid"],
        ref: "Create_Convo",
    })
    .where({ not_exists: checkIfConversationExists })
    .returning()
    .eval()

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
