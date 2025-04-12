import { NavigationContainer, DefaultTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "react-native"
import LoginScreen from "./screens/LoginScreen"
import ReportIncidentScreen from "./screens/ReportIncidentScreen"
import ResponderLoginScreen from "./screens/ResponderLoginScreen"
import ResponderNavigator from "./navigation/ResponderNavigator"

// Create a dark theme for navigation
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0A1929",
    card: "#0A2647",
    text: "#FFFFFF",
    border: "#144272",
    primary: "#2C74B3",
  },
}

// Define stack param list
export type RootStackParamList = {
  Login: undefined
  ReportIncident: undefined
  ResponderLogin: undefined
  ResponderMain: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const App = () => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#0A1929",
            },
            animation: "fade_from_bottom",
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
          <Stack.Screen name="ResponderLogin" component={ResponderLoginScreen} />
          <Stack.Screen name="ResponderMain" component={ResponderNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  )
}

export default App
