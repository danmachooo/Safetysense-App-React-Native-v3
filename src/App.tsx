import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar} from 'react-native';
import {useEffect} from 'react';

// Screens
import LoginScreen from './screens/LoginScreen';
import ReportIncidentScreen from './screens/ReportIncidentScreen';
import ResponderLoginScreen from './screens/ResponderLoginScreen';
import ResponderNavigator from './navigation/ResponderNavigator';

// Redux store
import {store, RootState, AppDispatch} from './store';
import {loadToken} from './store/slices/authSlice';

// Dark theme for the app
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A1929',
    card: '#0A2647',
    text: '#FFFFFF',
    border: '#144272',
    primary: '#2C74B3',
  },
};

// Stack navigator type
export type RootStackParamList = {
  Login: undefined;
  ReportIncident: undefined;
  ResponderLogin: undefined;
  ResponderMain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth stack (for unauthenticated users)
const AuthStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="ResponderLogin" component={ResponderLoginScreen} />
    <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
  </Stack.Navigator>
);

// App stack (for authenticated users)
const AppStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="ResponderMain" component={ResponderNavigator} />
    <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
  </Stack.Navigator>
);

// Main navigator logic
const MainNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isAuthenticated, loading} = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    dispatch(loadToken());
  }, [dispatch]);

  if (loading) {
    return null; // or a splash screen
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
};

// App entry
const App = () => {
  return (
    <Provider store={store}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <NavigationContainer theme={DarkTheme}>
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
