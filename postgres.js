require("dotenv").config()

const { Client } = require("pg")

const client = new Client(process.env.DATABASE_URL)

const query = `CREATE TABLE Conversations
(
  conversation_uid uuid                     NOT NULL,
  dateTime         timestamp with time zone NOT NULL,
  PRIMARY KEY (conversation_uid)
);

CREATE TABLE Messages
(
  message_uid      uuid                     NOT NULL,
  text             text                     NOT NULL,
  dateTime         timestamp with time zone NOT NULL,
  user_uid         uuid                     NOT NULL,
  conversation_uid uuid                     NOT NULL,
  PRIMARY KEY (message_uid)
);

CREATE TABLE User_Conversation
(
  user_uid         uuid NOT NULL,
  conversation_uid uuid NOT NULL,
  PRIMARY KEY (user_uid, conversation_uid)
);

CREATE TABLE Users
(
  user_uid uuid                     NOT NULL,
  email    character varying        NOT NULL,
  password character varying        NOT NULL,
  dateTime timestamp with time zone NOT NULL,
  username character varying        NOT NULL,
  PRIMARY KEY (user_uid)
);

ALTER TABLE User_Conversation
  ADD CONSTRAINT FK_Users_TO_User_Conversation
    FOREIGN KEY (user_uid)
    REFERENCES Users (user_uid);

ALTER TABLE User_Conversation
  ADD CONSTRAINT FK_Conversations_TO_User_Conversation
    FOREIGN KEY (conversation_uid)
    REFERENCES Conversations (conversation_uid);

ALTER TABLE Messages
  ADD CONSTRAINT FK_Users_TO_Messages
    FOREIGN KEY (user_uid)
    REFERENCES Users (user_uid);

ALTER TABLE Messages
  ADD CONSTRAINT FK_Conversations_TO_Messages
    FOREIGN KEY (conversation_uid)
    REFERENCES Conversations (conversation_uid);`

;(async () => {
    await client.connect()
    try {
        const results = await client.query(query)
        console.log(results)
    } catch (err) {
        console.error("error executing query:", err)
    } finally {
        client.end()
    }
})()
