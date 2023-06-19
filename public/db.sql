CREATE TABLE IF NOT EXISTS Users
(
  user_uid uuid                       NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      varchar(320)             NOT NULL UNIQUE CONSTRAINT email_length CHECK (char_length(email) >= 1),
  password   varchar(355)             NOT NULL CONSTRAINT password_length CHECK (char_length(password) >= 1),
  username   varchar(320)             NOT NULL CONSTRAINT username_length CHECK (char_length(username) >= 1),
  datetime   timestamptz              NOT NULL DEFAULT now(),
  last_email timestamptz              NOT NULL DEFAULT now(),
  verified   bool                     NOT NULL DEFAULT false
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
  text             text                     NOT NULL CONSTRAINT text_length CHECK (char_length(text) >= 1),
  datetime         timestamptz              NOT NULL DEFAULT now(),
  user_uid         uuid                     NOT NULL,
  conversation_uid uuid                     NOT NULL,
  FOREIGN KEY (user_uid) REFERENCES Users (user_uid),
  FOREIGN KEY (conversation_uid) REFERENCES Conversations (conversation_uid)
);