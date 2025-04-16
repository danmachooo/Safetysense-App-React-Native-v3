import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const instance = axios.create({
    baseURL: 'mybackend',
    timeout: 10000,
    headers: {
        'Content-Type' : 'application/json',
    },
});

instance.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
)

export default instance;