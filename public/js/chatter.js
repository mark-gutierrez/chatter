const { useState, useEffect, useRef, Component } = React

const socket = new WebSocket(
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host
)

function Online() {
    const [username, setUsername] = useState()

    socket.onopen = (event) => {
        socket.send(JSON.stringify({ type: "init" }))
    }

    socket.addEventListener("message", (message) => {
        const data = JSON.parse(message.data)
        setUsername(data.username)
    })

    return (
        <div>
            <h1>Hi {username}</h1>
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
