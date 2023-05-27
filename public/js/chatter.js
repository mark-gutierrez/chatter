const { useState, useEffect, useRef, Component } = React
const socket = new WebSocket(
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host
)

function Online() {
    const [username, setUsername] = useState("")
    const [userConvos, setuserConvos] = useState([])
    const [convoWith, setConvoWith] = useState({
        name: "",
        conversation_uid: "",
    })
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")

    socket.onopen = (event) => {
        socket.send(JSON.stringify({ type: "init" }))
    }

    socket.onmessage = (message) => {
        const data = JSON.parse(message.data)

        if (data.type === "init") {
            setUsername(data.username)
            setuserConvos(data.userConvos)
        }

        if (data.type === "getMessages") {
            setMessages(data.messages)
            console.log(data.messages)
        }

        if (data.type === "sendMessage") {
            console.log(data)
            updateMessages(data)
        }
    }

    function updateMessages(data) {
        if (convoWith.conversation_uid === data.message.conversation_uid) {
            setMessages([...messages, data.message])
        }
        setText("")
    }

    function handleClickConversation(e) {
        e.preventDefault()

        setConvoWith({
            name: e.target.innerText,
            conversation_uid: e.target.value,
        })
        socket.send(
            JSON.stringify({
                type: "getMessages",
                data: e.target.value,
            })
        )
    }

    function handleSubmitMessage(e) {
        e.preventDefault()

        socket.send(
            JSON.stringify({
                type: "sendMessage",
                data: {
                    conversation_uid: convoWith.conversation_uid,
                    text,
                },
            })
        )
    }

    return (
        <div>
            <h1>Hi {username}</h1>
            <ul>
                {userConvos.length > 0 &&
                    userConvos.map(
                        ({ conversation_uid, user_uid, username }) => (
                            <li key={user_uid}>
                                <button
                                    onClick={handleClickConversation}
                                    value={conversation_uid}
                                >
                                    {username}
                                </button>
                            </li>
                        )
                    )}
            </ul>
            <div>
                {convoWith.name !== "" && <h2>{convoWith.name}</h2>}
                <ul>
                    {messages.length > 0 &&
                        messages.map(({ message_uid, text, username }) => (
                            <li key={message_uid}>
                                {username}: {text}
                            </li>
                        ))}
                </ul>
                {convoWith.name !== "" && (
                    <form onSubmit={handleSubmitMessage}>
                        <input
                            type="text"
                            name="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        ></input>
                    </form>
                )}
            </div>
        </div>
    )
}

class App extends Component {
    render() {
        return (
            <div>
                <Online />
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
