CREATE TABLE IF NOT EXISTS Users
(
  user_uid uuid                     NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  email    varchar(320)             NOT NULL,
  password varchar(255)             NOT NULL,
  datetime timestamptz              NOT NULL DEFAULT now(),
  username varchar(320)             NOT NULL
);

CREATE TABLE IF NOT EXISTS Conversations
(
  conversation_uid uuid                     NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  datetime         timestamptz              NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS User_Conversation
(
  user_uid         uuid NOT NULL,
  conversation_uid uuid NOT NULL,
  PRIMARY KEY (user_uid, conversation_uid),
  FOREIGN KEY (user_uid) REFERENCES Users (user_uid),
  FOREIGN KEY (conversation_uid) REFERENCES Conversations (conversation_uid)
);

CREATE TABLE IF NOT EXISTS Messages
(
  message_uid      uuid                     NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  text             text                     NOT NULL,
  datetime         timestamptz              NOT NULL DEFAULT now(),
  user_uid         uuid                     NOT NULL,
  conversation_uid uuid                     NOT NULL,
  FOREIGN KEY (user_uid) REFERENCES Users (user_uid),
  FOREIGN KEY (conversation_uid) REFERENCES Conversations (conversation_uid)
);