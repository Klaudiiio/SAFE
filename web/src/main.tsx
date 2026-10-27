import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import AdminApp from "./AdminApp";
import "./styles.css";
import "./staff-account.css";

// 1. Force Axios to send cookies cross-origin
axios.defaults.withCredentials = true;

// 2. Helper to read the CSRF cookie Django sets
function getCookie(name: string) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 3. Attach the token to all requests
axios.interceptors.request.use(config => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);