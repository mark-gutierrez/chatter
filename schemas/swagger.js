module.exports = {
    swagger: {
        info: {
            title: "Chatter API",
            description: "Chatter API",
            version: "0.1.0",
        },
        externalDocs: {
            url: "https://swagger.io",
            description: "Find more info here",
        },
        host: "localhost:3000",
        schemes: ["http"],
        consumes: ["application/json"],
        produces: ["application/json"],
    },
}
