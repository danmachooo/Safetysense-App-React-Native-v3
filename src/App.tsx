'use client';

/* eslint-disable react-native/no-inline-styles */
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {useEffect, useRef} from 'react';
import {NavigationService} from './services/NavigationService'; // Updated path

// Screens
import LoginScreen from './screens/LoginScreen';
import ReportIncidentScreen from './screens/ReportIncidentScreen';
import ResponderLoginScreen from './screens/ResponderLoginScreen';
import ResponderNavigator from './navigation/ResponderNavigator';

// Redux store
import {store, type RootState, type AppDispatch} from './store';
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

const LoadingScreen = () => (
  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
    <ActivityIndicator size="large" color="#2C74B3" />
  </View>
);

// Main navigator logic
const MainNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isAuthenticated, loading} = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    (async () => {
      // This will load the auth token and subscribe to the topic if authenticated
      dispatch(loadToken());
    })();
  }, [dispatch]);

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
};

// App entry
const App = () => {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  return (
    <Provider store={store}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <NavigationContainer<RootStackParamList>
        theme={DarkTheme}
        ref={ref => {
          // Store the navigation ref for later use
          if (ref) {
            // @ts-ignore - Force the type to match
            NavigationService.setTopLevelNavigator(ref);
          }
          // Also store in the ref for component use if needed
          navigationRef.current = ref;
        }}>
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
