class SchemaSingleton {
    static #instance
    #models

    static get() {
        if (!SchemaSingleton.#instance) {
            SchemaSingleton.#instance = new SchemaSingleton()
            SchemaSingleton.#instance.initializeProperties()
        }
        return SchemaSingleton.#instance
    }

    initializeProperties() {
        this.#models = {
            users: {
                user_uid: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                password: {
                    type: "string",
                    pattern:
                        "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                },
                datetime: { type: "string" },
                username: { type: "string", minLength: 1 },
            },
            conversations: {
                conversation_uid: { type: "string", format: "uuid" },
                datetime: { type: "string" },
            },
            user_conversation: {
                user_uid: { type: "string", format: "uuid" },
                conversation_uid: { type: "string", format: "uuid" },
            },
            messages: {
                message_uid: { type: "string", format: "uuid" },
                text: { type: "string", minLength: 1 },
                datetime: { type: "string" },
                user_uid: { type: "string", format: "uuid" },
                conversation_uid: { type: "string", format: "uuid" },
            },
        }
    }

    build({ model = "", method = "", secure = true }) {}

    #model(name) {
        return { ...this.#models[name] }
    }

    getModels() {
        return { ...this.#models }
    }
}

if (typeof require !== "undefined" && require.main === module) {
    const s = SchemaSingleton.get()
}
