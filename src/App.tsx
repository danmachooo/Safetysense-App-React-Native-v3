import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import ReportIncidentScreen from './screens/ReportIncidentScreen';
import ResponderLoginScreen from './screens/ResponderLoginScreen';

// Create a dark theme for navigation
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A1929',
    card: '#0A1929',
    text: '#FFFFFF',
    border: '#1E3A5F',
    primary: '#1E88E5',
  },
};

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#0A1929',
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
        <Stack.Screen name="ResponderLogin" component={ResponderLoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;