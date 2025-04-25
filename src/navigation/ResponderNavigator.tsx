import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';

// Import screens
import DashboardScreen from '../screens/responder/DashboardScreen';
import IncidentDetailsScreen from '../screens/responder/IncidentDetailsScreen';
import ReportsScreen from '../screens/responder/ReportsScreen';
import ProfileScreen from '../screens/responder/ProfileScreen';
import CustomTabBar from '../components/CustomTabBar';

// Define types for navigation
export type ResponderStackParamList = {
  DashboardMain: undefined;
  IncidentDetails: {incident: Incident; source: 'dashboard' | 'reports'};
  ReportsMain: undefined;
};

export type ResponderTabParamList = {
  Dashboard: undefined;
  Reports: undefined;
  Profile: undefined;
};

// Define Incident type that will be used across components
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface IncidentType {
  name: string;
  icon: string;
  color: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  location: Location;
  timestamp: string;
  image: string;
  type: IncidentType; // Add this required property
  status?: string; // Make this more specific if possible
  resolvedAt?: string;
}

const Tab = createBottomTabNavigator<ResponderTabParamList>();
const Stack = createStackNavigator<ResponderStackParamList>();

// Stack navigator for Dashboard and Incident Details
const DashboardStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A2647',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: {backgroundColor: '#0A1929'},
      }}>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{title: 'Dashboard'}}
      />
      <Stack.Screen
        name="IncidentDetails"
        component={IncidentDetailsScreen}
        options={{title: 'Incident Details'}}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for Reports and Incident Details
const ReportsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A2647',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: {backgroundColor: '#0A1929'},
      }}>
      <Stack.Screen
        name="ReportsMain"
        component={ReportsScreen}
        options={{title: 'Reports'}}
      />
      <Stack.Screen
        name="IncidentDetails"
        component={IncidentDetailsScreen}
        options={{title: 'Incident Details'}}
      />
    </Stack.Navigator>
  );
};

// Main bottom tab navigator
const ResponderNavigator = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A2647'}} edges={['top']}>
      <Tab.Navigator
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Reports" component={ReportsStack} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default ResponderNavigator;
