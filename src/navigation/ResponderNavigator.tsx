import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { SafeAreaView } from "react-native-safe-area-context"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"

// Import screens
import DashboardScreen from "../screens/responder/DashboardScreen"
import IncidentDetailsScreen from "../screens/responder/IncidentDetailsScreen"
import ReportsScreen from "../screens/responder/ReportsScreen"
import ProfileScreen from "../screens/responder/ProfileScreen"

// Define types for navigation
export type ResponderStackParamList = {
  DashboardMain: undefined
  IncidentDetails: { incident: Incident }
  ReportsMain: undefined
}

export type ResponderTabParamList = {
  Dashboard: undefined
  Reports: undefined
  Profile: undefined
}

// Define Incident type that will be used across components
export interface Location {
  latitude: number
  longitude: number
  address: string
}

export interface Incident {
  id: string
  title: string
  description: string
  location: Location
  timestamp: string
  image: string
  status?: string
  resolvedAt?: string
}

const Tab = createBottomTabNavigator<ResponderTabParamList>()
const Stack = createStackNavigator<ResponderStackParamList>()

// Stack navigator for Dashboard and Incident Details
const DashboardStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0A2647",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "600",
        },
        cardStyle: { backgroundColor: "#0A1929" },
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: "Dashboard" }} />
      <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} options={{ title: "Incident Details" }} />
    </Stack.Navigator>
  )
}

// Stack navigator for Reports and Incident Details
const ReportsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0A2647",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "600",
        },
        cardStyle: { backgroundColor: "#0A1929" },
      }}
    >
      <Stack.Screen name="ReportsMain" component={ReportsScreen} options={{ title: "Reports" }} />
      <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} options={{ title: "Incident Details" }} />
    </Stack.Navigator>
  )
}

// Main bottom tab navigator
const ResponderNavigator = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A2647" }} edges={["top"]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = "alert-circle"

            if (route.name === "Dashboard") {
              iconName = focused ? "view-dashboard" : "view-dashboard-outline"
            } else if (route.name === "Reports") {
              iconName = focused ? "clipboard-list" : "clipboard-list-outline"
            } else if (route.name === "Profile") {
              iconName = focused ? "account" : "account-outline"
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#2C74B3",
          tabBarInactiveTintColor: "#8BABC7",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0A2647",
            borderTopColor: "#144272",
            paddingTop: 5,
            height: 60,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            paddingBottom: 5,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Reports" component={ReportsStack} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  )
}

export default ResponderNavigator
