import axios from "axios";
import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    axios
      .get("/api/data", {
        withCredentials: true,
      })
      .then((res) => setMessage(res.data.message))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          // User is logged in, fetch drive files
          fetch("/api/drive/root", { credentials: "include" })
            .then((res) => res.json())
            .then(setFiles)
            .catch(console.error);
        } else {
          console.log("User not logged in yet");
        }
      });
  }, []);

  return (
    <div>
      <h1>Raven PoC</h1>
      <p>{message}</p>
      <h1>My Google Drive Files</h1>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.name} ({file.mimeType})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
