const d = document
let socket = ""
let my_user_uid = ""
let current_conversation_uid = ""
let db = ""

// offline UI
const offlinePage = qs("#offline-page")
const formHeader = qs("#form-header")
const offlineButton = qs("#submit-offline")
const offlineForm = qs("#offline-form")
const toggle = qs("#toggle")
const emailInput = qs("#email")
const passwordInput = qs("#password")
const confirmPassowrd = qs("#confirm-password")
const forgotPassword = qs("#forgot-password")
const popup = qs("#popup")
const googleLogin = qs("#google-login")
const githubLogin = qs("#github-login")

toggle.onclick = toggleOfflineForm
function toggleOfflineForm() {
    if (formHeader.innerText === "Login") {
        formHeader.textContent = "Register"
        offlineButton.textContent = "Register"
        toggle.textContent = "Already have an account?"
        setVisibility({
            objects: [confirmPassowrd],
        })
        setVisibility({
            show: false,
            objects: [forgotPassword, googleLogin, githubLogin],
        })
    } else {
        formHeader.textContent = "Login"
        offlineButton.textContent = "Login"
        toggle.textContent = "Don't have an account?"
        setVisibility({
            show: false,
            objects: [confirmPassowrd],
        })
        setVisibility({
            objects: [
                toggle,
                forgotPassword,
                passwordInput,
                emailInput,
                googleLogin,
                githubLogin,
            ],
        })
    }
    offlineForm.reset()
}
forgotPassword.onclick = renderForgotPassword
function renderForgotPassword() {
    formHeader.textContent = "Reset Password"
    offlineButton.textContent = "Send Email"
    toggle.textContent = "Return to Login"
    setVisibility({
        objects: [emailInput],
    })
    setVisibility({
        show: false,
        objects: [passwordInput, forgotPassword, googleLogin, githubLogin],
    })
    offlineForm.reset()
}

function renderResetPassword() {
    formHeader.textContent = "New Password"
    setVisibility({
        objects: [confirmPassowrd],
    })
    setVisibility({
        show: false,
        objects: [emailInput, toggle, forgotPassword, googleLogin, githubLogin],
    })
    offlineButton.textContent = "Reset Password"
}

// offline functionality
offlineForm.onsubmit = handleOfflineSubmit
offlineButton.onclick = handleOfflineSubmit
async function handleOfflineSubmit(e) {
    e.preventDefault()
    const route = {
        Login: "/login",
        Register: "/register",
        "Reset Password": "/forgot-password",
        "New Password": "/reset-password",
    }

    const handler = route[formHeader.innerText]
    const formData = new FormData(offlineForm)
    const { email, password, confirmPassword } = Object.fromEntries(formData)

    if (!isEmail(email) && handler !== "/reset-password") {
        setPopUp(`Invalid Email`)
        return
    }

    if (handler === "/forgot-password") {
        if (email === "") {
            setPopUp(`All fields must be filled`)
            return
        }
    }

    if (handler === "/login") {
        if (email === "" || password === "") {
            setPopUp(`All fields must be filled`)
            return
        }
    }

    if (handler === "/register") {
        if (email === "" || password === "" || confirmPassword === "") {
            setPopUp(`All fields must be filled`)
            return
        }
        if (!isValidPassword(password, confirmPassword)) {
            setPopUp("Invalid password")
            return
        }
    }

    if (handler === "/reset-password") {
        if (password === "" || confirmPassword === "") {
            setPopUp(`All fields must be filled`)
            return
        }
        if (!isValidPassword(password, confirmPassword)) {
            setPopUp("Invalid password")
            return
        }
    }

    const params = new URL(d.location).searchParams
    const user_uid = params.get("reset-password") || ""
    const { data, message } = await postData(handler, {
        email: email.toLowerCase(),
        password,
        username: email.split("@")[0],
        user_uid,
    })

    if (message) {
        setPopUp(message)
        return
    }
    if (data) {
        setPopUp(data, false)
        if (
            handler === "/register" ||
            handler === "/forgot-password" ||
            handler === "/reset-password"
        )
            toggleOfflineForm()
        window.history.pushState({}, d.title, "/")
        if (handler === "/login") {
            my_user_uid = data
            renderChatter()
        }
        return
    }
}

// utils
function qs(string = "") {
    return d.querySelector(string)
}
function isEmail(e_mail) {
    const regexp =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return regexp.test(String(e_mail).toLowerCase())
}
function isValidPassword(pass_word, test_password) {
    // It contains at least:
    // - 8 characters
    // - one digit.
    // - one upper case alphabet.
    // - one lower case alphabet.
    // - one special character which includes #?!@$ %^&*-.
    const regexp =
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/
    return regexp.test(String(pass_word)) && pass_word === test_password
}
async function postData(url = "", data = {}) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
    return response.json()
}
function setPopUp(string = "", errorType = true) {
    popup.textContent = string
    if (errorType === true) {
        popup.style = "color: red"
    } else {
        popup.style = "color: green"
    }
    const timer = setTimeout(() => {
        popup.textContent = ""
    }, 7000)
    return () => clearTimeout(timer)
}
function setVisibility({ show = true, objects = [] }) {
    for (let i = 0; i < objects.length; i++) {
        if (show === true) {
            objects[i].removeAttribute("hidden")
        } else {
            objects[i].setAttribute("hidden", "hidden")
        }
    }
}
function send(object = {}) {
    socket.send(JSON.stringify(object))
}
function removeElementsFromParent(parent, elements) {
    const element = parent.getElementsByTagName(elements)
    while (element.length) {
        element[0].parentNode.removeChild(element[0])
    }
}
async function checkOnline(e) {
    const { ok, user_uid } = await fetch("/is-online")
        .then((res) => res.json())
        .catch((err) => setVisibility({ objects: [offlinePage] }))
    if (ok === true) {
        my_user_uid = user_uid
        renderChatter()
    } else {
        my_user_uid = ""
        setVisibility({ objects: [offlinePage] })
    }
}

// URL query Event Handlers
let params = new URL(d.location).searchParams
const successVerification = params.get("success-verification")
if (successVerification) {
    setPopUp(`${successVerification} successfully verified`, false)
    window.history.pushState({}, d.title, "/")
}

const resetPassword = params.get("reset-password")
if (resetPassword) renderResetPassword()

// ONLINE FUNCTIONALITY
const onlinePage = qs("#online-page")
const username = qs("#username")
const logout = qs("#logout")

const addNewChatterButton = qs("#add-new-chatter")
const searchNewChatterForm = qs("#search-chatter-form")
const searchNewChatter = qs("#search-chatter")

const currentChatter = qs("#current-chatter")
const addChattersList = qs("#add-chatters-list")
const currentChattersList = qs("#current-chatters-list")

const messagesInput = qs("#messages-input")
const messagesInputForm = qs("#messages-input-form")
const messagesSection = qs("#messages")

// ONLINE UI EVENTS
logout.onclick = handleLogout
async function handleLogout() {
    const { loggedOut } = await postData("/logout")
    if (loggedOut === true) {
        removeElementsFromParent(messagesSection, "div")
        removeElementsFromParent(currentChattersList, "button")
        setVisibility({ objects: [offlinePage] })
        setVisibility({ show: false, objects: [onlinePage] })
    }
}

// ADD NEW CHATTER FUNCTIONALITY
addNewChatterButton.onclick = handleAddNewChatterButton
function handleAddNewChatterButton() {
    if (searchNewChatter.hasAttribute("hidden")) {
        setVisibility({ objects: [searchNewChatter] })
        return
    }
    setVisibility({ show: false, objects: [searchNewChatter] })
    removeElementsFromParent(addChattersList, "button")
    searchNewChatterForm.reset()
}

searchNewChatterForm.onsubmit = handleAddNewChatterSubmit
async function handleAddNewChatterSubmit(e) {
    e.preventDefault()
    removeElementsFromParent(addChattersList, "button")
    const formData = new FormData(searchNewChatterForm)
    const { newChatter } = Object.fromEntries(formData)
    send({ type: "search", data: newChatter })
}

// EVENTS THAT RUN AFTER LOGIN
function renderChatter() {
    setVisibility({ show: false, objects: [offlinePage] })
    setVisibility({ objects: [onlinePage] })
    initDB(my_user_uid, postLogin)
}

function connectSocket(datetime = "") {
    socket = new WebSocket(
        (window.location.protocol === "https:" ? "wss://" : "ws://") +
            window.location.host
    )
    socket.onopen = function (event) {
        socket.send(JSON.stringify({ type: "init", data: datetime }))
    }
    socket.onmessage = function (message) {
        const data = JSON.parse(message.data)
        if (data.type === "init") {
            handleInit(data)
        }

        if (data.type === "search") {
            handleSearchUsers(data.users)
        }

        if (data.type === "add") {
            handleAddUser(data.newChatter)
            socket.send(
                JSON.stringify({
                    type: "addConvo",
                    data: data.newChatter.conversation_uid,
                })
            )
        }

        if (data.type === "message") {
            handleNewMessage(data.message)
        }
    }

    onclose = (event) => {}
}

function handleInit(data) {
    my_user_uid = data.user_uid
    username.textContent = data.username
    for (let i = 0; i < data.userConvos.length; i++) {
        handleAddUser(data.userConvos[i])
    }
    for (let i = 0; i < data.userMessages.length; i++) {
        insertDB("messages", data.userMessages[i])
    }
}

// Functions to Search and Add chatters
function handleSearchUsers(users) {
    const fragment = d.createDocumentFragment()

    for (let i = 0; i < users.length; i++) {
        const button = d.createElement("button")
        button.textContent = users[i].username
        button.value = users[i].user_uid
        button.addEventListener("click", handleClickNewChatter)
        fragment.append(button)
    }

    addChattersList.append(fragment)
}

function handleClickNewChatter(e) {
    e.preventDefault()
    send({ type: "add", data: e.target.value })
    handleAddNewChatterButton()
}

function handleAddUser(newChatter) {
    const button = d.createElement("button")
    button.textContent = newChatter.username
    button.value = newChatter.conversation_uid
    button.addEventListener("click", handleClickCurrentChatter)
    currentChattersList.append(button)

    //add to indexDB
    insertDB("conversations", newChatter)
}

// Messages Functionality
function handleClickCurrentChatter(e) {
    e.preventDefault()
    if (currentChatter.textContent === e.target.innerText) {
        currentChatter.textContent = ""
        messagesInputForm.reset()
        messagesInput.setAttribute("disabled", "")
        current_conversation_uid = ""
        removeElementsFromParent(messagesSection, "div")
    } else {
        removeElementsFromParent(messagesSection, "div")
        currentChatter.textContent = e.target.innerText
        messagesInput.removeAttribute("disabled")
        current_conversation_uid = e.target.value
        getMessagesDB(e.target.value)
    }
}

messagesInputForm.onsubmit = handleMessageSubmit
function handleMessageSubmit(e) {
    e.preventDefault()
    const formData = new FormData(messagesInputForm)
    const { text } = Object.fromEntries(formData)
    send({
        type: "message",
        data: { conversation_uid: current_conversation_uid, text },
    })
    messagesInputForm.reset()
}

function handleNewMessage(message) {
    if (current_conversation_uid === message.conversation_uid)
        renderNewMessage(message)

    insertDB("messages", message)
}

function renderNewMessage(message) {
    const fragment = d.createDocumentFragment()

    const div = d.createElement("div")

    const p_user = d.createElement("p")
    p_user.textContent = message.username
    p_user.classList.add("message-user")

    const p_text = d.createElement("p")
    p_text.textContent = message.text
    p_text.classList.add("message-text")

    if (message.user_uid === my_user_uid) {
        div.classList.add("message-self")
    } else {
        div.classList.add("message-other")
    }

    div.append(p_user)
    div.append(p_text)
    fragment.append(div)
    messagesSection.append(fragment)
}

// IndexedDB Functionality

function initDB(dbname, onSuccess, onUpgrade = chatterSchema, version = 1) {
    const indexedDB =
        window.indexedDB ||
        window.mozIndexedDB ||
        window.webkitIndexedDB ||
        window.msIndexedDB ||
        window.shimIndexedDB

    let request = indexedDB.open(dbname, version)

    request.onerror = function (err) {
        console.warn(err)
    }

    request.onsuccess = onSuccess

    request.onupgradeneeded = onUpgrade
}

function postLogin(e) {
    db = e.target.result
    lastDatetimeConnectSocket()
}

function insertDB(storeName = "", obj = {}, cb = []) {
    let tx = makeTX(storeName, "readwrite")
    let store = tx.objectStore(storeName)
    let request = store.add(obj)
    request.onsuccess = (e) => {
        cb.forEach((fn) => fn())
    }
    request.onerror = (err) => {
        console.log("error in request to add")
    }
}

function lastDatetimeConnectSocket() {
    let tx = makeTX("messages", "readonly")
    let store = tx.objectStore("messages")
    const query = store.getAll()
    query.onsuccess = function () {
        console.log("indexQuery", query.result)
        const last = query.result
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            ?.pop()
        connectSocket(last?.datetime)
    }
    query.onerror = (err) => {
        console.warn(err)
    }
}

function getMessagesDB(search = "") {
    let tx = makeTX("messages", "readonly")
    let store = tx.objectStore("messages")
    const indexed = store.index("conversation_uid_index")
    const query = indexed.getAll(search)
    query.onsuccess = function () {
        console.log("indexQuery", query.result)
        query.result
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            .forEach((msg) => renderNewMessage(msg))
    }
    query.onerror = (err) => {
        console.warn(err)
    }
}

function makeTX(storeName, mode) {
    let tx = db.transaction(storeName, mode)
    tx.onerror = (err) => {
        console.warn(err)
    }
    return tx
}

// IndexedDB Schemas

function chatterSchema(e) {
    let db = e.target.result
    console.log(`DB updated from version ${e.oldVersion} to ${e.newVersion}`)

    if (db.objectStoreNames.contains("conversations")) {
        db.deleteObjectStore("conversations")
    }
    if (db.objectStoreNames.contains("messages")) {
        db.deleteObjectStore("messages")
    }

    db.createObjectStore("conversations", {
        keyPath: "conversation_uid",
    })
    let messages = db.createObjectStore("messages", {
        keyPath: "message_uid",
    })

    messages.createIndex("conversation_uid_index", "conversation_uid", {
        unique: false,
    })
}

function userSchema(e) {
    let db = e.target.result
    console.log(`DB updated from version ${e.oldVersion} to ${e.newVersion}`)
    if (db.objectStoreNames.contains("users")) {
        db.deleteObjectStore("users")
    }
    db.createObjectStore("users", {
        keyPath: "user_uid",
    })
}

window.addEventListener("load", checkOnline)
