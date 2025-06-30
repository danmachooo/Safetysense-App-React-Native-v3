/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

/* eslint-disable react-native/no-inline-styles */
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, StatusBar, View, Text} from 'react-native';
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
import {NetworkInfo} from 'react-native-network-info';
import {BASE_URL} from '@env';
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
    <Text style={{color: '#FFFFFF', marginTop: 10}}>Loading...</Text>
  </View>
);

// Debug component to show auth state
const DebugAuthState = () => {
  const authState = useSelector((state: RootState) => state.auth);

  if (__DEV__) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 10,
          right: 10,
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 10,
          borderRadius: 5,
          zIndex: 1000,
        }}>
        <Text style={{color: 'white', fontSize: 12}}>DEBUG - Auth State:</Text>
        <Text style={{color: 'white', fontSize: 10}}>
          isAuthenticated: {authState.isAuthenticated ? 'TRUE' : 'FALSE'}
        </Text>
        <Text style={{color: 'white', fontSize: 10}}>
          token: {authState.token ? 'EXISTS' : 'NULL'}
        </Text>
        <Text style={{color: 'white', fontSize: 10}}>
          user: {authState.user ? authState.user.email : 'NULL'}
        </Text>
        <Text style={{color: 'white', fontSize: 10}}>
          loading: {authState.loading ? 'TRUE' : 'FALSE'}
        </Text>
        <Text style={{color: 'white', fontSize: 10}}>
          error: {authState.error || 'NONE'}
        </Text>
      </View>
    );
  }
  return null;
};

// Main navigator logic
const MainNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isAuthenticated, loading, token, user} = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    console.log('App mounted, loading token...');
    dispatch(loadToken());
  }, [dispatch]);

  // Add console logs for debugging
  useEffect(() => {
    console.log('Auth state changed:', {
      isAuthenticated,
      loading,
      hasToken: !!token,
      hasUser: !!user,
    });
  }, [isAuthenticated, loading, token, user]);

  if (loading) {
    console.log('App showing loading screen');
    return <LoadingScreen />;
  }

  NetworkInfo.getIPV4Address().then(ipv4Address => {
    console.log('Local IP: ', ipv4Address);
    console.log('Base IP: ', BASE_URL);
  });

  console.log(
    'App navigation decision:',
    isAuthenticated ? 'AppStack' : 'AuthStack',
  );
  return (
    <>
      {/* <DebugAuthState /> */}
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </>
  );
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
