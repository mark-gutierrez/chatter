class QueryBuilder {
    #meta
    #entities
    #usedTables

    constructor() {
        this.#meta = {}
        this.#usedTables = {}
        this.#entities = entityBuild(require("../schemas/models"))
    }

    // methods
    model({ model = "", as = "", custom = false }) {
        const method = "model"

        if (custom) {
            this.#meta[method] = model
            this.#meta["custom"] = true
            return this
        }

        // if model input is another query (subquery)
        if (model instanceof QueryBuilder) {
            this.#checkValues(method, [model, as])
            const meta = model.getMeta()
            const table = model.getUsedTables()
            this.#usedTables[as] = table[meta.model]
            this.#meta[method] = model
            this.#meta["as"] = as
            return this
        }

        // check if the model is one of the entities
        if (model === "" || !this.#isKeyInObject(this.#entities, model))
            throw new Error("model does not exist")

        // setting model alias
        this.#meta[method] = model
        if (as !== "") {
            this.#meta["as"] = as
        }
        this.#usedTables[as !== "" ? as : model] = this.#entities[model]

        return this
    }

    // TODO: build to work on joined tables
    select(fields = []) {
        const method = "select"

        if (this.#meta["custom"]) {
            this.#meta[method] = fields
            return this
        }

        this.#hasEnvoked({ fields: ["model"], method })

        // check if the select list are valid in the used tables
        this.#fieldsInModel({ fields, method: "select" })
        if (fields.length > 0) this.#adjustUsedTables({ fields })

        this.#meta[method] = fields
        return this
    }

    where(obj = {}) {
        const method = "where"

        this.#hasEnvoked({ fields: ["model"], method })
        const [f, v] = this.#getObjectFieldsAndValues(obj)
        this.#checkFields({ method, fields: f })
        this.#checkValues({ method, values: v })

        if (obj?.not_exists instanceof QueryBuilder) {
            this.#meta[method] = { not_exists: obj.not_exists.eval() }
            return this
        }

        for (const [key, value] of Object.entries(obj)) {
            const [fields, values] = this.#getObjectFieldsAndValues(value)
            this.#checkFields({ method, fields })
            this.#checkValues({ method, values })
            this.#fieldsInModel({ model: key, fields, method })
        }
        this.#meta[method] = obj
        return this
    }

    join({ model = "", as = "", field = "", joinTable = "" }) {
        const method = "join"
        const error = `Method: ${method} | Error:`

        this.#hasEnvoked({ fields: ["model", "select"], method })

        this.#checkFields({ method, fields: [model, as, field, joinTable] })

        if (!this.#isKeyInObject(this.#entities, model))
            throw new Error(
                `${error} reference model '${model}' does not exists `
            )
        if (!this.#isKeyInObject(this.#usedTables, joinTable))
            throw new Error(
                `${error} joinTable '${joinTable}' does not exists in the context of the query`
            )
        if (this.#isKeyInObject(this.#usedTables, as))
            throw new Error(`${error} as key '${as}' must be unique`)
        if (
            !this.#isKeyInObject(this.#entities[model], field) ||
            !this.#isKeyInObject(this.#usedTables[joinTable], field)
        )
            throw new Error(
                `${error} field value ${field} is not shared in both ${model} and ${joinTable} tables`
            )

        this.#meta[method] = this.#meta[method] || []
        this.#meta[method].push({ model, as, field, joinTable })
        this.#usedTables[as] = this.#entities[model]

        return this
    }

    with({ statments = [], final = "" }) {
        const method = "withQuery"
        if (!(final instanceof QueryBuilder))
            throw new Error(
                `Method: ${method} | Error: final statment is not a valid query`
            )
        if (statments.length === 0)
            throw new Error(
                `Method: ${method} | Error: statments list must have at least 1 query`
            )

        this.#meta[method] = this.#meta[method] || {}

        for (let i = 0; i < statments.length; i++) {
            const { table, query } = statments[i]

            if (table === undefined || query == undefined)
                throw new Error(
                    `Method: ${method} | Error: each statement entry must have table and query fields`
                )

            const [fields, values] = this.#getObjectFieldsAndValues(
                statments[i]
            )
            this.#checkFields({ fields, method })
            this.#checkValues({ values, method })

            if (!(query instanceof QueryBuilder))
                throw new Error(
                    `Method: ${method} | Error: query in statments must be an Query instance`
                )

            const { model } = query.getMeta()
            const tables = query.getUsedTables()[model]

            this.#usedTables[table] = tables
            this.#meta[method][table] = query.eval()
        }

        this.#meta["withCallBack"] = final.eval()

        return this
    }

    sort(fields = []) {
        const method = "sort"

        this.#hasEnvoked({ fields: ["model", "select"], method })
        this.#checkFields({ method, fields })

        // check if the sort list are valid in the used tables
        this.#fieldsInModel({
            fields: fields.map((e) => e.replace("-", "")),
            method,
        })

        this.#meta[method] = fields
        return this
    }

    limit(limit = 10) {
        const method = "limit"
        this.#hasEnvoked({ fields: ["model", "select"], method })
        this.#meta[method] = limit
        return this
    }

    offset(offset = 0) {
        const method = "offset"
        this.#hasEnvoked({ fields: ["model", "select"], method })
        this.#meta[method] = offset
        return this
    }

    insert(obj = {}) {
        const method = "insert"
        this.#hasEnvoked({ fields: ["model"], method })

        if (obj?.subquery instanceof QueryBuilder) {
            const { select } = obj.subquery.getMeta()
            if (
                Object.keys(this.#usedTables[this.#meta["model"]]).length !==
                select.length
            )
                throw new Error(
                    `Method: ${method} | Error: Subquery shape does not match input model`
                )
            this.#meta[method] = { subquery: obj.subquery.eval() }
            return this
        }

        const [fields, values] = this.#getObjectFieldsAndValues(obj)
        this.#checkValues({ method, values })
        this.#fieldsInModel({ fields, method })
        this.#meta[method] = obj
        return this
    }

    returning(fields = []) {
        const method = "returning"
        this.#hasEnvoked({ fields: ["model"], method })
        this.#fieldsInModel({ fields, method })
        if (fields.length > 0) this.#adjustUsedTables({ fields })
        this.#meta[method] = fields
        return this
    }

    update(obj = {}) {
        const method = "update"
        this.#hasEnvoked({ fields: ["model"], method })
        const [fields, values] = this.#getObjectFieldsAndValues(obj)
        this.#checkFields({ method, fields })
        this.#checkValues({ method, values })
        this.#fieldsInModel({ fields, method })
        this.#meta[method] = obj
        return this
    }

    delete(obj = {}) {
        const method = "remove"
        this.#hasEnvoked({ fields: ["model"], method })
        const [fields, values] = this.#getObjectFieldsAndValues(obj)
        this.#checkFields({ method, fields })
        this.#checkValues({ method, values })
        this.#fieldsInModel({ fields, method })
        this.#meta[method] = {}
        const temp = {}
        temp[this.#meta["model"]] = obj
        this.#meta["where"] = temp
        return this
    }

    // util methods
    #hasEnvoked({ fields = [], method = "" }) {
        for (let i = 0; i < fields.length; i++) {
            if (!this.#isKeyInObject(this.#meta, fields[i]))
                throw new Error(
                    `Method: '${fields[i]}' must be envoked before using '${method}'`
                )
        }
    }

    #checkFields({ method = "", fields = [] }) {
        // checks if all object is not empty
        if (fields.length === 0)
            throw new Error(
                `'${method}' method cannot be envoked with empty fields`
            )
    }

    #checkValues({ method = "", values = [] }) {
        // check if all values are not null
        if (values.length > 0 && values.includes(""))
            throw new Error(`All values in ${method} object must not be empty`)
    }

    #isKeyInObject(obj = {}, name = "") {
        return obj[name] !== undefined
    }

    #listToString(list = [], joiner = ", ") {
        return list.join(joiner)
    }

    #getObjectFieldsAndValues(obj = {}) {
        return [Object.keys(obj), Object.values(obj)]
    }

    #fieldsInModel({ model = this.#meta["model"], fields = [], method }) {
        // check if the object fields are valid in the used tables
        for (let i = 0; i < fields.length; i++) {
            if (
                !(
                    (
                        this.#isKeyInObject(
                            this.#usedTables[model],
                            fields[i]
                        ) ||
                        this.#isKeyInObject(this.#entities[model], fields[i])
                    ) // might be problematic
                )
            )
                throw new Error(
                    `Method: '${method}' | Field: '${fields[i]}' does not exist in Model: '${model}'`
                )
        }
    }

    #adjustUsedTables({ model = this.#meta["model"], fields = [] }) {
        const table = JSON.parse(JSON.stringify(this.#usedTables[model]))

        for (const [key, value] of Object.entries(table)) {
            if (!fields.includes(key)) delete table[key]
        }

        this.#usedTables[model] = table
    }

    #whereResolver(obj = {}, table = "") {
        let queryList = []
        for (const [key, value] of Object.entries(obj)) {
            queryList.push(
                `${table}.${key} ${
                    value.includes("$NOT$")
                        ? `!= '${value.replace("$NOT$", "")}'`
                        : `= '${value}'`
                }`
            )
        }
        return queryList
    }

    #datetimeResolver(datetime = "{}", table = "") {
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
                `${table}.datetime ${dateTimeFilters[key]} '${value}'`
            )
        }

        return dateTimeQuery
    }

    #appendStrings(...theArgs) {
        let string = ""
        for (const arg of theArgs) {
            string += `${arg} `
        }
        return string
    }

    // external methods
    getEntities() {
        return this.#entities
    }
    getMeta() {
        return this.#meta
    }
    getUsedTables() {
        return this.#usedTables
    }

    // meta data to string
    eval(end = "") {
        const {
            model,
            select,
            insert,
            update,
            remove,
            where,
            sort,
            limit,
            offset,
            returning,
            as,
            join,
            withQuery,
            withCallBack,
        } = this.#meta

        let query = ""

        if (select) {
            query = this.#appendStrings(
                query,
                "SELECT",
                select.length > 0 ? this.#listToString(select) : "*"
            )
        }
        if (insert) {
            if (insert?.subquery) {
                query = this.#appendStrings(
                    query,
                    "INSERT INTO",
                    model,
                    insert.subquery
                )
            } else {
                const [fields, values] = this.#getObjectFieldsAndValues(insert)
                query = this.#appendStrings(
                    query,
                    "INSERT INTO",
                    model,
                    `${
                        fields.length === 0
                            ? "DEFAULT VALUES"
                            : `(${this.#listToString(
                                  fields
                              )}) VALUES (${this.#listToString(
                                  values.map((e) => `'${e}'`)
                              )})`
                    }`
                )
            }
        }
        if (model && update) {
            const [fields, values] = this.#getObjectFieldsAndValues(update)
            query = this.#appendStrings(
                query,
                "UPDATE",
                model,
                "SET",
                `(${this.#listToString(fields)}) = (${this.#listToString(
                    values.map((e) => `'${e}'`)
                )})`
            )
        }
        if (model && remove) {
            query = this.#appendStrings(query, "DELETE FROM", model)
        }
        if (model && select) {
            query = this.#appendStrings(
                query,
                "FROM",
                `${
                    model instanceof QueryBuilder ? `(${model.eval()})` : model
                }`,
                `${as ? `as ${as}` : ""}`
            )
        }

        if (join) {
            for (let i = 0; i < join.length; i++) {
                const obj = join[i]
                query = this.#appendStrings(
                    query,
                    "JOIN",
                    `${obj.model} as ${obj.as} ON ${obj.joinTable}.${obj.field} = ${obj.as}.${obj.field}`
                )
            }
        }
        if (where) {
            if (where?.not_exists) {
                query = this.#appendStrings(
                    query,
                    "WHERE NOT EXISTS",
                    `(${where.not_exists})`
                )
            } else {
                let list = []
                for (const [key, value] of Object.entries(where)) {
                    let { datetime, ...rest } = value
                    let queryList = this.#whereResolver(rest, key)
                    datetime = this.#datetimeResolver(datetime, key)
                    list = [...list, ...queryList, ...datetime]
                }
                query = this.#appendStrings(
                    query,
                    "WHERE",
                    this.#listToString(list, " AND ")
                )
            }
        }
        if (sort) {
            query = this.#appendStrings(
                query,
                "ORDER BY",
                sort.map((e) =>
                    Array.from(e)[0] === "-"
                        ? ` ${e.substring(1)} DESC`
                        : ` ${e} ASC`
                )
            )
        }
        if (limit) {
            query = this.#appendStrings(query, "LIMIT", limit)
        }
        if (offset) {
            query = this.#appendStrings(query, "OFFSET", offset)
        }
        if (returning) {
            query = this.#appendStrings(
                query,
                "RETURNING",
                returning.length > 0 ? this.#listToString(returning) : "*"
            )
        }

        if (withQuery && withCallBack) {
            let statements = []
            for (const [key, value] of Object.entries(withQuery)) {
                statements.push(`${key} as (${value})`)
            }

            query = this.#appendStrings(
                "with",
                this.#listToString(statements),
                withCallBack
            )
        }

        return (query + end).trim()
    }
}

function entityBuild(model = {}) {
    let obj = {}
    Object.keys(model).forEach((key) => {
        obj[key] = model[key]()
    })
    return obj
}

function QueryFactory() {
    return new QueryBuilder()
}

module.exports = QueryFactory

if (typeof require !== "undefined" && require.main === module) {
    const user_uid = "74e0c87d-62b5-4f78-a968-c84181086562"
    const user_uid1 = "23a9295c-3d16-4cf1-9bfd-c4f484c6c9e6"
    const user_uid2 = "1e41df4c-02ee-4473-b504-465f6a971f2b"
    const conversation_uid = "13b7304a-0d80-4b5c-8cz49-ef117baf5a5e"

    const findUser1Convo = QueryFactory()
        .model({ model: "user_conversation" })
        .select()
        .where({ user_conversation: { user_uid } })

    const getConversationsForUser = QueryFactory()
        .model({
            model: findUser1Convo,
            as: "a",
        })
        .select()
        .join({
            model: "user_conversation",
            as: "b",
            field: "conversation_uid",
            joinTable: "a",
        })
        .join({
            model: "users",
            as: "c",
            field: "user_uid",
            joinTable: "b",
        })
        .where({
            b: { user_uid: `$NOT$${user_uid}` },
        })

    const findMessages = QueryFactory()
        .model({ model: "messages" })
        .select()
        .where({ messages: { conversation_uid } })
        .sort(["datetime"])

    const populateMessages = QueryFactory()
        .model({ model: findMessages, as: "a" })
        .select()
        .join({ model: "users", as: "b", field: "user_uid", joinTable: "a" })

    const findUserConversations = QueryFactory()
        .model({ model: "user_conversation" })
        .select()
        .where({ user_conversation: { user_uid: user_uid1 } })

    const checkIfConversationExists = QueryFactory()
        .model({
            model: findUserConversations,
            as: "a",
        })
        .select()
        .join({
            model: "user_conversation",
            as: "b",
            field: "conversation_uid",
            joinTable: "a",
        })
        .where({ b: { user_uid: user_uid2 } })

    const createConversationInstance = QueryFactory()
        .model({
            model: "conversations",
        })
        .insert()
        .returning()

    const selectQuery1 = QueryFactory()
        .model({ model: "Create_Convo", custom: true })
        .select([`'${user_uid1}'`, "conversation_uid"])
    const selectQuery2 = QueryFactory()
        .model({ model: "Create_Convo", custom: true })
        .select([`'${user_uid2}'`, "conversation_uid"])
    const addUserOneToConversation = QueryFactory()
        .model({
            model: "user_conversation",
        })
        .insert({ subquery: selectQuery1 })
        .returning()
    const addUserTwoToConversation = QueryFactory()
        .model({
            model: "user_conversation",
        })
        .insert({ subquery: selectQuery2 })
        .where({ not_exists: checkIfConversationExists })
        .returning()

    const createConversation = QueryFactory().with({
        statments: [
            {
                table: "Create_Convo",
                query: createConversationInstance,
            },
            {
                table: "First_User",
                query: addUserOneToConversation,
            },
        ],
        final: addUserTwoToConversation,
    })
}
