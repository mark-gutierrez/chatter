function users() {
    return {
        user_uid: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        password: {
            type: "string",
            pattern:
                "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
        },
        datetime: { type: "string" },
        username: { type: "string", minLength: 1 },
    }
}

function conversations() {
    return {
        conversation_uid: { type: "string", format: "uuid" },
        datetime: { type: "string" },
    }
}

function user_conversation() {
    return {
        user_uid: { type: "string", format: "uuid" },
        conversation_uid: { type: "string", format: "uuid" },
    }
}

function messages() {
    return {
        message_uid: { type: "string", format: "uuid" },
        text: { type: "string", minLength: 1 },
        datetime: { type: "string" },
        user_uid: { type: "string", format: "uuid" },
        conversation_uid: { type: "string", format: "uuid" },
    }
}

module.exports = {
    users,
    conversations,
    user_conversation,
    messages,
}
