// import axios from "axios";

// export const api = axios.create();

// api.interceptors.request.use((config) => {
//   if (typeof window !== "undefined") {
//     const token = localStorage.getItem("access_token");
//     if (token) {
//       config.headers = config.headers ?? {};
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//   }

//   return config;
// });
import axios from "axios";

export const api = axios.create();

api.interceptors.request.use(
  (config) => {
    // Only run in browser
    if (typeof window === "undefined") return config;

    const token = localStorage.getItem("access_token");

    // If this request is meant to be protected but token is missing → stop here
    if (!token) {
      // Create an Axios-style error
      const err: any = new Error("Missing access token");
      err.code = "NO_TOKEN";
      err.config = config;
      return Promise.reject(err);
    }

    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);
