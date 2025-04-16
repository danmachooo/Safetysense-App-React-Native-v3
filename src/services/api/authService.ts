import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "./axios";

export const login = async (email: string, password: string) => {
    const response = await axios.post('', {
        email, password
    });

    const token = response.data.token;
    if(token) {
        await AsyncStorage.setItem('authToken', token);
    }

    return response.data;
}

export const logout = async () => {
    await AsyncStorage.removeItem('authToken');
};
  