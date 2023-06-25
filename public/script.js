const d = document
const n = navigator
let socket = ""
let my_user_uid = ""
let current_conversation_uid = ""

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
    offlineButton.textContent = "Reset Password"
    setVisibility({
        objects: [confirmPassowrd],
    })
    setVisibility({
        show: false,
        objects: [emailInput, toggle, forgotPassword, googleLogin, githubLogin],
    })
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
            offlineForm.reset()
            window.location.replace("/")
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
function rmElements(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}
async function checkOnline(e) {
    try {
        const { ok } = await fetch("/is-online").then((res) => res.json())
        return ok
    } catch (error) {
        return false
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

const menu = qs("#menu")
const chattersSection = qs("#chatters")
const currentChatSection = qs("#current-chat")

// ONLINE UI EVENTS
logout.onclick = handleLogout
async function handleLogout() {
    const { loggedOut } = await postData("/logout")
    if (loggedOut === true) {
        sendSWMessage({ type: "logout", data: my_user_uid })
        my_user_uid = ""
        current_conversation_uid = ""
        currentChatter.textContent = "User"
        rmElements(messagesSection)
        rmElements(currentChattersList)
        setVisibility({ objects: [offlinePage] })
        setVisibility({ show: false, objects: [onlinePage] })
    }
}

menu.onclick = handleMenu
function handleMenu() {
    if (currentChatSection.style.display === "flex") {
        chattersSection.style.display = "flex"
        currentChatSection.style.display = "none"

        // destroy messages view
        currentChatter.textContent = ""
        messagesInputForm.reset()
        messagesInput.setAttribute("disabled", "")
        current_conversation_uid = ""
        rmElements(messagesSection)
    } else {
        chattersSection.style.display = "none"
        currentChatSection.style.display = "flex"
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
    rmElements(addChattersList)
    searchNewChatterForm.reset()
}

searchNewChatterForm.onsubmit = handleAddNewChatterSubmit
async function handleAddNewChatterSubmit(e) {
    e.preventDefault()
    rmElements(addChattersList)
    const formData = new FormData(searchNewChatterForm)
    const { newChatter } = Object.fromEntries(formData)
    send({ type: "search", data: newChatter })
}

// EVENTS THAT RUN AFTER LOGIN
async function renderChatter() {
    const sw = await n.serviceWorker
    if (sw.controller === null) {
        connectSocket()
    } else {
        sendSWMessage({ type: "login" })
    }
    setVisibility({ show: false, objects: [offlinePage] })
    setVisibility({ objects: [onlinePage] })
}

function connectSocket(datetime = "") {
    socket = new WebSocket(
        (window.location.protocol === "https:" ? "wss://" : "ws://") +
            window.location.host
    )
    socket.onopen = function (event) {
        socket.send(
            JSON.stringify({
                type: "init",
                data: datetime,
            })
        )
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

    socket.onclose = (event) => {
        console.log("disconnected")
        sendSWMessage({ type: "offlineMode" })
    }
}

function handleInit(data) {
    logout.textContent = "Logout"
    logout.onclick = handleLogout

    my_user_uid = data.user_uid
    username.textContent = data.username
    sendSWMessage({
        type: "addUser",
        data: {
            user_uid: data.user_uid,
            username: data.username,
            jwt: data.jwt,
        },
    })
    rmElements(currentChattersList)
    for (let i = 0; i < data.userConvos.length; i++) {
        handleAddUser(data.userConvos[i])
    }
    for (let i = 0; i < data.userMessages.length; i++) {
        sendSWMessage({
            type: "addMessage",
            data: { user_uid: my_user_uid, message: data.userMessages[i] },
        })
    }
    sendSWMessage({
        type: "evalSeen",
        data: { user_uid: data.user_uid },
    })
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

function renderCurrentChatter(newChatter) {
    const button = d.createElement("button")
    button.textContent = newChatter.username
    button.value = newChatter.conversation_uid
    button.addEventListener("click", handleClickCurrentChatter)
    currentChattersList.append(button)
}

function handleAddUser(newChatter) {
    renderCurrentChatter(newChatter)

    //add to indexDB
    newChatter.seen = 0
    sendSWMessage({
        type: "addConvo",
        data: { user_uid: my_user_uid, newChatter },
    })
}

// Messages Functionality
function handleClickCurrentChatter(e) {
    e.preventDefault()
    if (currentChatter.textContent === e.target.innerText) {
        currentChatter.textContent = ""
        messagesInputForm.reset()
        messagesInput.setAttribute("disabled", "")
        current_conversation_uid = ""
        rmElements(messagesSection)
    } else {
        rmElements(messagesSection)
        currentChatter.textContent = e.target.innerText
        messagesInput.removeAttribute("disabled")
        current_conversation_uid = e.target.value
        sendSWMessage({
            type: "getMessages",
            data: {
                conversation_uid: e.target.value,
                user_uid: my_user_uid,
                username: e.target.innerText,
            },
        })
        e.target.style.background = ""

        // mobile
        const width = window.innerWidth > 0 ? window.innerWidth : screen.width
        if (width < 480) handleMenu()
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
    sendSWMessage({
        type: "addMessage",
        data: { user_uid: my_user_uid, message },
    })
    if (current_conversation_uid === message.conversation_uid) {
        renderNewMessage(message)
        messagesSection.scroll({
            top: messagesSection.scrollHeight,
            behavior: "auto",
        })
        sendSWMessage({
            type: "updateSeen",
            data: {
                conversation_uid: message.conversation_uid,
                username: currentChatter.textContent,
                user_uid: my_user_uid,
            },
        })
    } else {
        sendSWMessage({
            type: "evalSeen",
            data: {
                user_uid: my_user_uid,
            },
        })
    }
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

// Service Worker
async function serviceWorker() {
    if ("serviceWorker" in n) {
        try {
            let sw = await n.serviceWorker.register("/sw.js", {
                scope: "/",
            })
            if (sw.installing) {
                setVisibility({ objects: [offlinePage] })
            }
            n.serviceWorker.addEventListener("controllerchange", () => {
                sw = n.serviceWorker.controller
            })
            n.serviceWorker.addEventListener("message", handleSWMessage)
        } catch (error) {
            console.error(`Registration failed with ${error}`)
        }
    }
}

async function handleSWMessage(e) {
    const { type, data } = e.data

    if (type === "login") {
        if (data === undefined) {
            connectSocket()
        } else {
            connectSocket(data)
        }
    }

    if (type === "logout") {
        console.log(`successful logout ${my_user_uid}`)
    }

    if (type === "getMessages") {
        data.sort(
            (a, b) => new Date(a.datetime) - new Date(b.datetime)
        ).forEach((msg) => renderNewMessage(msg))
        messagesSection.scroll({
            top: messagesSection.scrollHeight,
            behavior: "smooth",
        })
    }

    if (type === "evalSeen") {
        const chatters = currentChattersList.children
        for (let i = 0; i < chatters.length; i++) {
            chatters[i].style.background = data[chatters[i].value]
        }
    }

    if (type === "offlineMode") {
        my_user_uid = data?.user_uid
        username.textContent = data?.username
        rmElements(currentChattersList)
        for (let i = 0; i < data.userConvos.length; i++) {
            renderCurrentChatter(data.userConvos[i])
        }
        setVisibility({
            show: false,
            objects: [offlinePage],
        })
        setVisibility({ objects: [onlinePage] })
        logout.textContent = "Reconnect"
        logout.onclick = function () {
            sendSWMessage({ type: "reconnect" })
            // sendSWMessage({ type: "login" })
        }
    }

    if (type === "reconnect") {
        const request = await postData("/reconnect", data)
        if (request.authenticated === true) {
            sendSWMessage({ type: "login" })
        } else {
            await handleLogout()
        }
    }

    if (type === "init") {
        if (data === undefined) {
            const request = await fetch("/is-online").then((res) => res.json())

            if (request.ok === true) {
                connectSocket()
                setVisibility({ show: false, objects: [offlinePage] })
                setVisibility({ objects: [onlinePage] })
            } else {
                setVisibility({ objects: [offlinePage] })
            }
            return
        }
        if (!n.onLine) {
            sendSWMessage({ type: "offlineMode" })
            return
        }
        const status = await checkOnline()
        if (status === false) {
            sendSWMessage({ type: "offlineMode" })
            return
        }
        renderChatter()
    }
}

async function sendSWMessage(obj = {}) {
    const sw = await n.serviceWorker.ready
    sw.active.postMessage(obj)
}

// onload
async function init() {
    await serviceWorker()
    await sendSWMessage({ type: "init" })
}

// onload

window.addEventListener("load", function () {
    init()
})
