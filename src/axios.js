import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:5051', // backend server URL
    withCredentials: true,            // if you want cookies/sessions
});

export default instance;
