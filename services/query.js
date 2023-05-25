// SQL Query Builder
// NOTE: 'where' subqueries default to WHERE NOT EXISTS
// NOTE: 'with' method not safe.

class QueryBuilder {
    #entities
    constructor(schema, tables) {
        this.schema = schema ?? {}
        this.tables = tables ?? {}
        this.#entities = entityBuild(require("../schemas/models"))
    }

    // used methods
    model({ model = "", as }) {
        const method = "model"

        // model subqueries
        if (model instanceof QueryBuilder) {
            this.#error(
                !(model.schema?.model && model.schema?.select),
                `Subquery instance invalid, needs 'model' and 'select' fields`
            )
            this.#error(
                as === "" || !as,
                `'as' field required when using subquery as model`
            )

            const { schema, tables } = model
            this.schema[method] = schema
            this.schema["as"] = as

            // mutates table from subquery and asigns it as table in this instance as the 'as' variable
            const newTable = this.#updateTable({
                select: schema?.select,
                tables,
            })

            this.tables[as] = newTable
            return this
        }

        // check if the model is one of the entities
        this.#error(
            model === "" || !this.#keyInObject(model, this.#entities),
            `${method}: ${model} is not an available entity`
        )

        this.#error(
            as !== undefined && as === "",
            `${method}: 'as' field cannot be empty`
        )

        // set schema values
        this.schema[method] = model
        this.schema["as"] = as !== undefined ? as : undefined
        this.tables[as !== undefined ? as : model] = this.#entities[model]
        return this
    }

    select(obj = {}) {
        // obj = { table: ['field'] }
        const method = "select"

        // check dependencies
        this.#dependencies({ methods: ["model"], method })
        this.#uniqueMethod({ methods: ["update", "delete", "insert"], method })

        // check if object is empty
        if (Object.keys(obj).length === 0) {
            this.schema[method] = {}
            return this
        }

        // Validation
        for (const [model, fields] of Object.entries(obj)) {
            // validate that it is selecting from an existing model
            this.#keysInObject({ keys: [model], obj: this.tables, method })

            // validating that the fields it queries exist in the model.
            this.#keysInObject({
                keys: fields,
                obj: this.tables[model],
                method,
                name: model,
            })
            this.#checkFields({ method, fields })
        }

        this.schema[method] = obj
        return this
    }

    join({ model = "", as = "", field = "", joinTable = "" }) {
        const method = "join"

        // check dependencies and fields
        this.#dependencies({ methods: ["model"], method })
        this.#checkFields({ method, fields: [model, as, field, joinTable] })

        // validation checks
        this.#error(
            !this.#keyInObject(model, this.#entities),
            `${method}: reference model '${model}' does not exists `
        )
        this.#error(
            !this.#keyInObject(joinTable, this.tables),
            `${method}: joinTable '${joinTable}' does not exists in the context of the query`
        )
        this.#error(
            this.#keyInObject(as, this.tables),
            `${method}: as key '${as}' must be unique`
        )
        this.#error(
            !(
                this.#keyInObject(field, this.#entities[model]) &&
                this.#keyInObject(field, this.tables[joinTable])
            ),
            `${method}: field value ${field} is not shared in both ${model} and ${joinTable} tables`
        )

        // save to schema and tables
        this.schema[method] = this.schema[method] || []
        this.schema[method].push({ model, as, field, joinTable })
        this.tables[as] = this.#entities[model]

        return this
    }

    where(obj = {}) {
        // obj = { tableName: { key: 'value' } }
        const method = "where"

        this.#dependencies({ methods: ["model"], method })
        this.#optionalDependencies({
            methods: ["select", "update", "delete"],
            method,
        })

        this.#checkFields({ method, fields: Object.keys(obj) })

        // TODO: subquery is jank no validation or safety
        if (obj?.not_exists instanceof QueryBuilder) {
            this.schema[method] = obj.not_exists
        }

        // validation checks
        for (const [key, value] of Object.entries(obj)) {
            const [fields, values] = this.#objKeyValue(value)
            this.#checkFields({ method, fields })
            this.#checkValues({ method, values })

            // check tables that it queries exists
            this.#keyInObject(key, this.tables)
            // check fields of the tables it queries exists
            this.#keysInObject({
                keys: fields,
                obj: this.tables[key],
                method,
                name: key,
            })
        }

        this.schema[method] = obj

        return this
    }

    sort(obj = {}) {
        // obj = { tableName: ['field', '-field'] }
        const method = "sort"

        this.#dependencies({ methods: ["model", "select"], method })
        this.#checkFields({ method, fields: Object.keys(obj) })

        // validation checks
        for (const [fields, values] of Object.entries(obj)) {
            this.#checkFields({ method, fields })
            this.#checkFields({ method, fields: values })
            this.#checkValues({ method, values })
            // check tables that it queries exists
            this.#keyInObject(fields, this.tables)

            // check fields of the tables it queries exists
            this.#keysInObject({
                keys: values.map((e) => e.replace("-", "")),
                obj: this.tables[fields],
                method,
                name: fields,
            })
        }

        this.schema[method] = obj

        return this
    }

    limit(limit = 10) {
        const method = "limit"
        this.#dependencies({ methods: ["model", "select"], method })
        this.schema[method] = limit
        return this
    }

    offset(offset = 0) {
        const method = "offset"
        this.#dependencies({ methods: ["model", "select"], method })
        this.schema[method] = offset
        return this
    }

    insert(obj = {}) {
        const method = "insert"
        this.#dependencies({ methods: ["model"], method })
        this.#uniqueMethod({ methods: ["update", "delete", "select"], method })

        // obj = {items: [ {key: value} ],}
        if (obj?.items instanceof QueryBuilder) {
            const { schema, tables } = obj.items
            if (!(schema?.model && schema?.select))
                throw new Error(
                    `Subquery instance invalid, needs 'model' and 'select' fields`
                )

            const newTable = this.#updateTable({
                select: schema?.select,
                tables,
            })

            // check if subquery tables has the fields in the query instance
            this.#keysInObject({
                keys: Object.keys(newTable),
                obj: this.tables[this.schema.as ?? this.schema.model],
                method,
                name: `this.tables[${this.schema.as ?? this.schema.model}]`,
            })

            this.schema[method] = obj

            return this
        }

        // No items
        if (obj?.items === undefined) {
            this.schema[method] = { items: [] }
            return this
        }

        const { items } = obj
        const entry1 = items[0]

        // validators
        for (let item of items) {
            const [keys, values] = this.#objKeyValue(item)
            this.#checkValues({ method, values })
            // check entry fields exist in model
            this.#keysInObject({
                keys,
                obj: this.tables[this.schema.as ?? this.schema.model],
                method,
                name: `this.tables[${this.schema.as ?? this.schema.model}]`,
            })

            // check if each entry is a consistent shape
            this.#error(
                Object.keys(entry1).length !== keys.length,
                `${method}: object entries are not equal shape`
            )

            // checks if each entry has the same fields as the initial entry
            for (const key of keys) {
                this.#error(
                    !Object.keys(entry1).includes(key),
                    `${method}: '${key}' does not match key fields with initial entry`
                )
            }
        }

        this.schema[method] = obj
        return this
    }

    update(obj = {}) {
        const method = "update"
        this.#dependencies({ methods: ["model"], method })
        this.#uniqueMethod({ methods: ["insert", "delete", "select"], method })

        const [fields, values] = this.#objKeyValue(obj)
        this.#checkFields({ method, fields })
        this.#checkValues({ method, values })
        this.#keysInObject({
            keys: fields,
            method,
            obj: this.tables[this.schema.as ?? this.schema.model],
            name: this.schema.as ?? this.schema.model,
        })

        this.schema[method] = obj

        return this
    }

    delete(obj = {}) {
        const method = "delete"
        this.#uniqueMethod({ methods: ["insert", "update", "select"], method })

        this.schema[method] = obj
        return this
    }

    // TODO: pls for the love of GOD DO NOT USE without knowing if query works. NO VALIDATION CHECK ON THIS
    with({ subquery, name }) {
        const method = "withQuery"
        this.#error(
            !(name || subquery),
            `${method}: object passed must have 'subquery' and 'name' fields`
        )
        this.#error(
            !(subquery instanceof QueryBuilder),
            `${method}: subquery field must be an Query instance`
        )
        this.#error(name === "", `${method}: name must not be and empty string`)

        this.schema[method] = this.schema[method] || []
        this.schema[method].push({ subquery, name })
        return this
    }

    returning(obj = {}) {
        // obj = { tableName: [fields] }
        const method = "returning"
        this.#dependencies({ methods: ["model"], method })
        this.#optionalDependencies({
            methods: ["insert", "update", "delete"],
            method,
        })

        // check if object is empty
        if (Object.keys(obj).length === 0) {
            this.schema[method] = {}
            return this
        }

        // Validation
        for (const [model, fields] of Object.entries(obj)) {
            // validate that it is selecting from an existing model
            this.#keysInObject({ keys: [model], obj: this.tables, method })

            // validating that the fields it queries exist in the model.
            this.#keysInObject({
                keys: fields,
                obj: this.tables[model],
                method,
                name: model,
            })
            this.#checkFields({ method, fields })
        }

        this.schema[method] = obj
        return this
    }

    // util methods
    #uniqueMethod({ methods = [], method = "" }) {
        this.#error(
            methods.some((element) => this.#keyInObject(element, this.schema)),
            `${method}: cannot be called as ${this.#listToString(
                methods,
                " or "
            )} has already be used`
        )
    }
    #optionalDependencies({ methods = [], method = "" }) {
        this.#error(
            !methods.some((element) => this.#keyInObject(element, this.schema)),
            `${method}: one of ${this.#listToString(
                methods
            )} methods must be used before '${method}' is envoked`
        )
    }
    #error(conditional = false, errorMessage = "An Error was thrown") {
        if (conditional) {
            throw new Error(errorMessage)
        }
    }
    #keyInObject(key = "", obj = {}) {
        return obj[key] !== undefined
    }
    #checkFields({ method = "", fields = [] }) {
        this.#error(
            fields.length === 0,
            `'${method}' method cannot be envoked with empty fields`
        )
    }
    #checkValues({ method = "", values = [] }) {
        this.#error(
            values.length > 0 && values.includes(""),
            `All values in ${method} object must not be empty`
        )
    }
    #dependencies({ methods = [], method = "" }) {
        for (let i = 0; i < methods.length; i++) {
            this.#error(
                !this.#keyInObject(methods[i], this.schema),
                `Method: '${methods[i]}' must be used before using '${method}'`
            )
        }
    }
    #keysInObject({ keys = [], obj = {}, method = "", name = "this.tables" }) {
        // check if the object fields are valid in the used tables
        for (let i = 0; i < keys.length; i++) {
            if (!this.#keyInObject(keys[i], obj))
                throw new Error(
                    `Method: '${method}' | Key: '${keys[i]}' does not exist in object '${name}'`
                )
        }
    }
    #updateTable({ select, tables }) {
        let obj = {}
        if (Object.keys(select).length === 0) {
            // is select is empty coalesce
            for (const [key, value] of Object.entries(tables)) {
                obj = Object.assign(obj, value)
            }
        } else {
            // only get the selected items
            for (const [key, value] of Object.entries(tables)) {
                const filter = select[key]
                if (filter === undefined) {
                    delete tables[key]
                    continue
                }

                for (const [k, v] of Object.entries(value)) {
                    if (!filter.includes(k)) delete tables[key][k]
                }

                obj = Object.assign(obj, tables[key])
            }
        }

        return obj
    }
    #objKeyValue(obj = {}) {
        return [Object.keys(obj), Object.values(obj)]
    }
    #whereResolver(obj = {}, table = "", custom) {
        let queryList = []
        for (const [key, value] of Object.entries(obj)) {
            queryList.push(
                `${custom ? "" : `${table}.`}${key} ${
                    value.includes("$NOT$")
                        ? `!= '${value.replace("$NOT$", "")}'`
                        : `= '${value}'`
                }`
            )
        }
        return queryList
    }
    #datetimeResolver(datetime = "{}", table = "", custom) {
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
                `${custom ? "" : `${table}.`}datetime ${
                    dateTimeFilters[key]
                } '${value}'`
            )
        }

        return dateTimeQuery
    }
    #listToString(list = [], joiner = ", ") {
        return list.join(joiner)
    }
    #append(...args) {
        let string = ""
        for (const arg of args) {
            string += `${arg} `
        }
        return string
    }

    // schema builder
    eval(obj = {}) {
        const {
            model,
            as,
            select,
            join,
            where,
            sort,
            limit,
            offset,
            insert,
            returning,
            custom,
            withQuery,
            update,
            delete: remove,
        } = obj?.schema ?? this.schema
        let query = ""

        if (select && model) {
            // transform select schema to string
            const list = []
            for (const [key, value] of Object.entries(select)) {
                for (let i = 0; i < value.length; i++) {
                    list.push(`${custom ? "" : `${key}.`}${value[i]}`)
                }
            }
            query = this.#append(
                query,
                "SELECT",
                `${list.length === 0 ? "*" : `${this.#listToString(list)}`}`,
                "FROM"
            )

            if (model?.model) {
                // selecting from a subquery
                const subquery = this.eval({ schema: model })
                query = this.#append(query, `(${subquery}) as ${as}`)
            } else {
                // normal select query
                query = this.#append(
                    query,
                    `${model} ${as === undefined ? "" : `as ${as}`}`
                )
            }
        }

        if (join && select && model) {
            for (let i = 0; i < join.length; i++) {
                const { model: name, as: alias, field, joinTable } = join[i]
                query = this.#append(
                    query,
                    `JOIN ${name} as ${alias} ON ${alias}.${field} = ${joinTable}.${field}`
                )
            }
        }

        if (model && where && update) {
            const [keys, values] = this.#objKeyValue(update)

            query = this.#append(
                query,
                `UPDATE ${model}${as === undefined ? "" : ` as ${as}`} SET`,
                `(${this.#listToString(keys)}) = (${this.#listToString(
                    values.map((e) => `'${e}'`)
                )})`
            )
        }

        if (model && where && remove) {
            query = this.#append(
                query,
                `DELETE FROM ${model}${as === undefined ? "" : ` as ${as}`}`
            )
        }

        if (where && model && (select || update || remove)) {
            // TODO: abstraction of where not exists subquery is jank need to fix
            if (where instanceof QueryBuilder) {
                query = this.#append(
                    query,
                    "WHERE NOT EXISTS",
                    `(${this.eval({ schema: where.schema })})`
                )
            } else {
                let list = []
                for (const [key, value] of Object.entries(where)) {
                    let { datetime, ...rest } = value
                    let queryList = this.#whereResolver(rest, key, custom)
                    datetime = this.#datetimeResolver(datetime, key, custom)
                    list = [...list, ...queryList, ...datetime]
                }
                query = this.#append(
                    query,
                    "WHERE",
                    this.#listToString(list, " AND ")
                )
            }
        }

        if (sort && model && select) {
            let list = []
            for (const [key, value] of Object.entries(sort)) {
                for (let i = 0; i < value.length; i++) {
                    if (value[i].startsWith("-")) {
                        list.push(
                            `${custom ? "" : `${key}.`}${value[i].substring(
                                1
                            )} DESC`
                        )
                    } else {
                        list.push(`${custom ? "" : `${key}.`}${value[i]} ASC`)
                    }
                }
            }
            query = this.#append(query, "ORDER BY", this.#listToString(list))
        }

        if (limit && model && select) {
            query = this.#append(query, "LIMIT", limit)
        }

        if (offset && model && select) {
            query = this.#append(query, "OFFSET", offset)
        }

        if (insert && model) {
            const { items } = insert
            query = this.#append(
                query,
                "INSERT INTO",
                `${model} ${as !== undefined ? `as ${as}` : ""}`
            )
            if (items instanceof QueryBuilder) {
                const { schema } = items
                query = this.#append(query, `${this.eval({ schema })}`)
            }

            if (items.length > 0) {
                let list = []
                const fields = Object.keys(items[0])
                for (const item of items) {
                    let innerList = []
                    for (const field of fields) {
                        innerList.push(`'${item[field]}'`)
                    }
                    list.push(`(${this.#listToString(innerList)})`)
                }
                query = this.#append(
                    query,
                    `(${this.#listToString(fields)})`,
                    "VALUES",
                    this.#listToString(list)
                )
            }
            if (items.length === 0) {
                query = this.#append(query, "DEFAULT VALUES")
            }
        }

        if (
            returning &&
            model &&
            (insert || (update && where) || (remove && where))
        ) {
            if (Object.keys(returning).length === 0)
                query = this.#append(query, "RETURNING *")
            else {
                let list = []
                for (const [keys, values] of Object.entries(returning)) {
                    for (const value of values) {
                        list.push(`${custom ? "" : `${keys}.`}${value}`)
                    }
                }
                query = this.#append(
                    query,
                    "RETURNING",
                    this.#listToString(list)
                )
            }
        }

        // for the love of GOD DO NOT USE 'WITH' IT IS NOT SAFE
        if (withQuery) {
            let list = []
            for (let i = 0; i < withQuery.length; i++) {
                const {
                    subquery: { schema },
                    name,
                } = withQuery[i]
                if (i === withQuery.length - 1) break
                list.push(
                    `${name} as (${this.eval({
                        schema,
                    })})`
                )
            }

            query = this.#append(
                query,
                "with",
                `${this.#listToString(list)}`,
                `${this.eval({
                    schema: withQuery[withQuery.length - 1].subquery.schema,
                })}`
            )
        }

        return query
    }

    getEntities() {
        return this.#entities
    }
}

function entityBuild(model = {}) {
    let obj = {}
    Object.keys(model).forEach((key) => {
        obj[key] = model[key]()
    })
    return obj
}

function QueryFactory(schema, tables) {
    return new QueryBuilder(schema, tables)
}

module.exports = QueryFactory

if (typeof require !== "undefined" && require.main === module) {
    const q = QueryFactory

    // testing select queries
    const getUser = q()
        .model({ model: "users", as: "b" })
        .select({ b: ["user_uid", "username", "email"] })

    // testing subqueries
    const joinedTable = q()
        .model({ model: "users", as: "a" })
        .join({
            model: "user_conversation",
            as: "b",
            field: "user_uid",
            joinTable: "a",
        })
        .join({
            model: "conversations",
            as: "c",
            field: "conversation_uid",
            joinTable: "b",
        })
        .select({})
        .where({
            a: { username: "mark.gtrez" },
        })
        .sort({ a: ["-user_uid"], b: ["conversation_uid"], c: ["datetime"] })

    // meta table coalesce
    const getMessages = q()
        .model({ model: joinedTable, as: "messages" })
        .select({ messages: ["user_uid"] })
        .where({
            messages: { username: "mark.gtrez" },
        })
        .sort({ messages: ["username", "-email"] })
        .limit()
        .offset()

    // insert table
    const insertUser = q()
        .model({ model: "users", as: "a" })
        .insert({
            items: [
                {
                    email: "user@gmail.com",
                    password: "User1234!",
                    username: "user",
                },
                {
                    email: "user1@gmail.com",
                    password: "User1234!",
                    username: "user1",
                },
            ],
        })
        .returning({ a: ["user_uid", "username"] })

    const selectUser = q()
        .model({ model: "users" })
        .select({ users: ["user_uid", "username", "email"] })
        .where({ users: { user_uid: "gbfdhjk" } })

    // insert subquery
    const newUser = q().model({ model: "users" }).insert({ items: selectUser })

    // custom query || no validation || straight from schema
    const custom = q({
        model: "Create_Convo",
        custom: true,
        as: undefined,
        select: {
            Create_Convo: [
                "805a4fdf-17c5-4410-b8f0-09a0c9852c7e",
                "conversation_uid",
            ],
        },
    })

    const insertNewUser = q()
        .model({ model: "user_conversation" })
        .insert({ items: custom })
        .returning()

    const user_uid = "74e0c87d-62b5-4f78-a968-c84181086562"
    const user_uid1 = "805a4fdf-17c5-4410-b8f0-09a0c9852c7e"
    const user_uid2 = "e4c7bd04-ab93-4869-9298-6b150c9fc8e1"
    const conversation_uid = "13b7304a-0d80-4b5c-8c49-ef117baf5a5e"

    const getConversationsForUser = q()
        .model({
            model: q()
                .model({ model: "user_conversation" })
                .select({ user_conversation: ["conversation_uid"] })
                .where({ user_conversation: { user_uid } }),
            as: "a",
        })
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
        .select({ b: ["conversation_uid"], c: ["user_uid", "username"] })
        .where({
            b: { user_uid: `$NOT$${user_uid}` },
        })

    const populateMessages = q()
        .model({
            model: q()
                .model({ model: "messages" })
                .select()
                .where({ messages: { conversation_uid } }),
            as: "a",
        })
        .join({ model: "users", as: "b", field: "user_uid", joinTable: "a" })
        .select({
            a: ["text", "message_uid", "datetime"],
            b: ["username", "user_uid"],
        })
        .sort({ a: ["-datetime"] })

    //  CHECKS IF CONVO EXISTS BETWEEN TWO USERS
    const convoExists = q()
        .model({
            model: q()
                .model({ model: "user_conversation" })
                .select()
                .where({ user_conversation: { user_uid: user_uid1 } }),
            as: "a",
        })
        .join({
            model: "user_conversation",
            as: "b",
            field: "conversation_uid",
            joinTable: "a",
        })
        .select({})
        .where({ b: { user_uid: user_uid2 } })

    // CREATE CONVERSATION INSTANCE
    const firstWith = q().model({ model: "conversations" }).insert().returning()

    // INSERT FIRST USER INTO THE CONVERSATION
    const secondWith = q()
        .model({ model: "user_conversation" })
        .insert({
            items: q({
                model: "Create_Convo",
                custom: true,
                select: { any: [`'${user_uid1}'`, "conversation_uid"] },
            }),
        })
        .returning()

    // INSERT SECOND USER INTO THE CONVEVRSATION
    const finalwith = q()
        .model({ model: "user_conversation" })
        .insert({
            items: q({
                model: "Create_Convo",
                custom: true,
                select: { any: [`'${user_uid2}'`, "conversation_uid"] },
                where: convoExists,
            }),
        })
        .returning()

    //  THIS CREATES CONVERSATION IF IT DOES NOT EXIST
    const createConversation = q()
        .with({ subquery: firstWith, name: "Create_Convo" })
        .with({ subquery: secondWith, name: "First_User" })
        .with({ subquery: finalwith, name: "last" })

    const updateUser = q()
        .model({ model: "users", as: "a" })
        .update({ user_uid: "gfnshjk", username: "gfhjdkbhj" })
        .where({ a: { user_uid: "gfbsdahfks" } })
        .returning()

    const deleteUser = q()
        .model({ model: "users" })
        .delete()
        .where({ users: { user_uid: "gfbdhjgbrhja" } })
        .returning()
}
