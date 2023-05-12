function users() {
    return {
        user_uid: { type: "string" },
        email: { type: "string" },
        password: { type: "string" },
        datetime: { type: "string" },
        username: { type: "string" },
    }
}

function conversations() {
    return {
        conversation_uid: { type: "string" },
        datetime: { type: "string" },
    }
}

function user_conversation() {
    return {
        user_uid: { type: "string" },
        conversation_uid: { type: "string" },
    }
}

function messages() {
    return {
        message_uid: { type: "string" },
        text: { type: "string" },
        datetime: { type: "string" },
        user_uid: { type: "string" },
        conversation_uid: { type: "string" },
    }
}

module.exports = {
    users,
    conversations,
    user_conversation,
    messages,
}
