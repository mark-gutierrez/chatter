const { Client } = require("pg")
require("dotenv").config()
const client = new Client(process.env.DATABASE_URL)

async function connect() {
    await client.connect()
}

connect()

class DBService {
    static #instance
    #client

    static getInstance() {
        if (!DBService.#instance) {
            DBService.#instance = new DBService()
            DBService.#instance.initializeProperty()
        }
        return DBService.#instance
    }

    initializeProperty() {
        this.#client = client
    }
}

module.exports = DBService
