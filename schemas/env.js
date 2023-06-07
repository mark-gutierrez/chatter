const path = require("node:path")

module.exports = {
    schema: {
        type: "object",
        required: ["PORT"],
        properties: {
            PORT: {
                type: "string",
                default: 3000,
            },
            DATABASE_URL: {
                type: "string",
            },
            DB_PASSWORD: {
                type: "string",
            },
            SESSION_SECRET: {
                type: "string",
            },
            JWT_SECRET: {
                type: "string",
            },
            SENDGRID_API_KEY: {
                type: "string",
            },
            WEBSITE: {
                type: "string",
            },
            ENV: {
                type: "string",
            },
        },
    },
    dotenv: {
        path: path.join(__dirname, "..", ".env"),
        debug: true,
    },
}
