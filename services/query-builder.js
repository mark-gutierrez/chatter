class QueryBuilder {
    #model
    #fields
    #entities
    #joinTables

    constructor() {
        this.query = ""
        this.#model = ""
        this.#fields = ""
        this.#entities = entityBuild(require("../schemas/models"))
        this.#joinTables = {}
    }

    customModel({ query, name, model }) {
        this.query = ""
        if ((query === "", name === "", model === ""))
            throw new Error("Empty query, name, model fields in customModel")

        if (!this.#isValidModel(model))
            throw new Error("Invalid model name in custom model")
        this.#joinTables = {}
        this.#joinTables[name] = this.#entities[model]
        this.query = `SELECT * FROM (${query.slice(0, -1)}) AS ${name}`
        return this
    }

    join({ model, name, on }) {
        if (Object.keys(this.#joinTables).length === 0) {
            this.#joinTables[this.#model] = this.#entities[this.#model]
        }

        if ((name === "", model === ""))
            throw new Error("Empty name, model fields in join")

        if (!this.#isValidModel(model))
            throw new Error("Invalid model name in join")

        if (!this.#isUniqueNameForJoinTable(name))
            throw new Error("Name used in join is already used")

        if (Object.keys(on) === 0 || on[Object.keys(on)[0]].length !== 2)
            throw new Error("Invalid 'on' format in join")

        this.#joinTables[name] = this.#entities[model]

        if (!this.#isValidOnValues(on))
            throw new Error("Invalid 'on' values for join")

        this.query = `${
            this.query
        } JOIN ${model} AS ${name} ON ${this.#parseOnToString(on)}`
        return this
    }

    customWhere(obj = {}) {
        const { table, field, value } = obj
        if (this.#joinTables[table][field] === undefined)
            throw new Error(`Table ${table} or field ${field} invalid`)

        this.query = `${this.query} WHERE ${table}.${field} ${
            value.includes("$NOT$")
                ? `!= '${value.replace("$NOT$", "")}'`
                : `= '${value}'`
        }`

        return this
    }

    // methods for basic CRUD queries
    model(model) {
        this.query = ""
        const fields = this.#entities[model]
        if (!fields) throw new Error("Model does not exist")
        this.#model = model
        this.#fields = fields
        return this
    }

    find(obj = {}) {
        this.#isValidFields(obj, "find")
        this.query = `SELECT * FROM ${this.#model}`
        if (!this.#isObjectEmpty(obj)) {
            this.where(obj)
        }
        return this
    }

    insert(obj = {}) {
        this.#isValidFields(obj, "insert")
        const init = `INSERT INTO ${this.#model}`
        this.query = this.#isObjectEmpty(obj)
            ? `${init} DEFAULT VALUES`
            : `${init} ${this.#genInsert(obj)}`
        return this
    }

    update(obj = {}) {
        this.#isValidFields(obj, "update")
        if (this.#isObjectEmpty(obj)) throw new Error("Empty object to update")
        this.query = `UPDATE ${this.#model} SET ${this.#filter(obj)}`
        return this
    }

    delete(obj = {}) {
        this.#isValidFields(obj, "delete")
        this.query = `DELETE FROM ${this.#model}`
        this.where(obj)
        return this
    }

    where(obj = {}) {
        this.#isValidFields(obj, "where")
        const whereQuery = !this.#isObjectEmpty(obj)
            ? `WHERE ${this.#filter(obj, " AND ")}`
            : ""
        this.query = `${this.query} ${whereQuery}`
        return this
    }

    select(list = []) {
        if (list.length === 0) return this
        this.#isValidFields(list, "select")
        this.query = this.query.replace(" * ", ` ${this.#listToString(list)} `)
        return this
    }

    returning(list = []) {
        this.#isValidFields(list, "returning")
        let init = `${this.query} RETURNING`
        this.query =
            list.length === 0
                ? `${init} *`
                : `${init} ${this.#listToString(list)}`
        return this
    }

    sort(list = []) {
        this.#isValidFields(
            list.map((e) => e.replace("-", "")),
            "sort"
        )
        this.query = `${this.query} ${
            list.length > 0
                ? `ORDER BY${list.map((e) =>
                      Array.from(e)[0] === "-"
                          ? ` ${e.substring(1)} DESC`
                          : ` ${e} ASC`
                  )}`
                : ""
        }`
        return this
    }

    limit(limit = 10) {
        this.query = `${this.query} LIMIT ${limit}`
        return this
    }

    offset(skip = 0) {
        this.query = `${this.query} OFFSET ${skip}`
        return this
    }

    // private utility methods
    #isObjectEmpty(obj = {}) {
        return Object.keys(obj).length === 0
    }

    #genInsert(obj = {}) {
        let fields = []
        let values = []
        for (const [key, value] of Object.entries(obj)) {
            fields.push(key)
            values.push(`'${value}'`)
        }

        return `(${this.#listToString(fields)}) VALUES (${this.#listToString(
            values
        )})`
    }

    #listToString(list = []) {
        return list.join(", ")
    }

    #isUniqueNameForJoinTable(name = "") {
        return this.#joinTables[name] === undefined
    }

    #isValidOnValues(on = {}) {
        const join = Object.keys(on)[0]
        const tableList = on[join]
        for (let i = 0; i < tableList.length; i++) {
            const table = this.#joinTables[tableList[i]]
            if (table === undefined || table[join] === undefined) return false
        }
        return true
    }

    #parseOnToString(on = {}) {
        const join = Object.keys(on)[0]
        const [table1, table2] = on[join]
        return `${table1}.${join} = ${table2}.${join}`
    }

    #isValidModel(model = "") {
        return this.#entities[model] !== undefined
    }

    #isValidFields(args = [], method) {
        if (!(args instanceof Array)) {
            args = Object.keys(args)
        }
        for (let i = 0; i < args.length; i++) {
            if (!this.#hasFieldsInModel(args[i]))
                throw new Error(`Invalid field ${args[i]} in ${method}`)
        }
    }

    #hasFieldsInModel(item = "") {
        return this.#fields[item] !== undefined
    }

    #filter(obj, delimiter = ", ") {
        let { datetime, ...rest } = obj

        let query = []
        for (const [key, value] of Object.entries(rest)) {
            query.push(`${key} = '${value}'`)
        }

        if (datetime) {
            let dateTimeQuery = []
            const dateTimeFilters = {
                gt: ">",
                gte: ">=",
                lt: "<",
                lte: "<=",
            }
            datetime = JSON.parse(datetime)

            for (const [key, value] of Object.entries(datetime)) {
                dateTimeQuery.push(
                    `datetime ${dateTimeFilters[key]} '${value}'`
                )
            }
            query = [...query, ...dateTimeQuery]
        }

        return query.join(delimiter)
    }

    // public methods used externally
    getEntities() {
        return this.#entities
    }

    // final method to run
    eval() {
        this.#model = ""
        this.#fields = ""
        this.#joinTables = {}
        return this.query + ";"
    }
}

function entityBuild(model = {}) {
    let obj = {}
    Object.keys(model).forEach((key) => {
        obj[key] = model[key]()
    })
    return obj
}

class QuerySingleton {
    static #instance
    #builder

    static get() {
        if (!QuerySingleton.#instance) {
            QuerySingleton.#instance = new QuerySingleton()
            QuerySingleton.#instance.initializeProperties()
        }
        return QuerySingleton.#instance.#builder
    }

    initializeProperties() {
        this.#builder = new QueryBuilder()
    }
}

if (typeof require !== "undefined" && require.main === module) {
    const q = QuerySingleton.get()
    const user_uid = "74e0c87d-62b5-4f78-a968-c84181086562"
    const getConversationsForUser = q
        .customModel({
            query: q.model("user_conversation").find({ user_uid }).eval(),
            name: "a",
            model: "user_conversation",
        })
        .join({
            model: "user_conversation",
            name: "b",
            on: { conversation_uid: ["a", "b"] },
        })
        .join({
            model: "users",
            name: "c",
            on: { user_uid: ["b", "c"] },
        })
        .customWhere({
            table: "a",
            field: "user_uid",
            value: `$NOT$${user_uid}`,
        })
        .eval()

    const conversation_uid = "13b7304a-0d80-4b5c-8c49-ef117baf5a5e"
    const populateMessages = q
        .customModel({
            query: q.model("messages").find({ conversation_uid }).eval(),
            name: "a",
            model: "messages",
        })
        .join({ model: "users", name: "b", on: { user_uid: ["a", "b"] } })
        .eval()

    const user_uid1 = "805a4fdf-17c5-4410-b8f0-09a0c9852c7e"
    const user_uid2 = "74e0c87d-62b5-4f78-a968-c84181086562"
    const checkIfConversationExists = q
        .customModel({
            query: q.model("users").find({ user_uid: user_uid1 }).eval(),
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

    const createConversation = q
        .model("conversations")
        .insert()
        .returning(["conversation_uid"])
        .eval()

    console.log(getConversationsForUser)
    console.log(populateMessages)
    console.log(checkIfConversationExists)
    console.log(createConversation)
}

module.exports = QuerySingleton.get()
