"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import { SafeAreaView } from "react-native-safe-area-context"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import type { ResponderStackParamList, Incident } from "../../navigation/ResponderNavigator"
import { JSX } from 'react/jsx-runtime';

// Define navigation prop type
type DashboardScreenNavigationProp = StackNavigationProp<ResponderStackParamList, "DashboardMain">

// View modes
const VIEW_MODES = {
  LIST: "list",
  MAP: "map",
} as const

type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

// Mock data for incidents
const MOCK_INCIDENTS: Incident[] = [
  {
    id: "1",
    title: "Traffic Accident",
    description: "Two-vehicle collision with possible injuries",
    location: { latitude: 37.7749, longitude: -122.4194, address: "123 Main St" },
    timestamp: new Date().toISOString(),
    image: "https://via.placeholder.com/150",
  },
  {
    id: "2",
    title: "Medical Emergency",
    description: "Person collapsed in public area",
    location: { latitude: 37.7833, longitude: -122.4167, address: "456 Market St" },
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    image: "https://via.placeholder.com/150",
  },
  {
    id: "3",
    title: "Fire Reported",
    description: "Small fire in residential building",
    location: { latitude: 37.7694, longitude: -122.4862, address: "789 Ocean Ave" },
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    image: "https://via.placeholder.com/150",
  },
]

// Google Maps Dark Mode Style
const mapDarkStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>()
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.LIST)
  const [loading, setLoading] = useState<boolean>(false)

  // Function to format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Navigate to incident details
  const handleIncidentPress = (incident: Incident): void => {
    navigation.navigate("IncidentDetails", { incident })
  }

  // Toggle between list and map view
  const toggleViewMode = (): void => {
    setViewMode(viewMode === VIEW_MODES.LIST ? VIEW_MODES.MAP : VIEW_MODES.LIST)
  }

  // Render incident card
  const renderIncidentCard = ({ item }: { item: Incident }): JSX.Element => (
    <TouchableOpacity style={styles.card} onPress={() => handleIncidentPress(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#8BABC7" />
          <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardDetails}>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardLocation}>
            <MaterialCommunityIcons name="map-marker" size={14} color="#2C74B3" /> {item.location.address}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewDetailsButton} onPress={() => handleIncidentPress(item)}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#2C74B3" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  // Render map markers
  const renderMapMarkers = () => {
    return incidents.map((incident) => (
      <Marker
        key={incident.id}
        coordinate={{
          latitude: incident.location.latitude,
          longitude: incident.location.longitude,
        }}
        title={incident.title}
        description={incident.description}
        onCalloutPress={() => handleIncidentPress(incident)}
      >
        <View style={styles.markerContainer}>
          <MaterialCommunityIcons name="alert-circle" size={30} color="#E53935" />
        </View>
      </Marker>
    ))
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Incoming Reports</Text>
          <TouchableOpacity style={styles.viewToggle} onPress={toggleViewMode}>
            <MaterialCommunityIcons
              name={viewMode === VIEW_MODES.LIST ? "map" : "format-list-bulleted"}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2C74B3" style={styles.loader} />
        ) : viewMode === VIEW_MODES.LIST ? (
          <FlatList
            data={incidents}
            renderItem={renderIncidentCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              customMapStyle={mapDarkStyle}
              initialRegion={{
                latitude: 37.7749,
                longitude: -122.4194,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
              }}
            >
              {renderMapMarkers()}
            </MapView>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#0A2647",
    borderBottomWidth: 1,
    borderBottomColor: "#144272",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  viewToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#144272",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#0A2647",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#144272",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTime: {
    fontSize: 12,
    color: "#8BABC7",
    marginLeft: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#144272",
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardDescription: {
    fontSize: 14,
    color: "#E0E0E0",
    marginBottom: 8,
    lineHeight: 20,
  },
  cardLocation: {
    fontSize: 12,
    color: "#8BABC7",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#144272",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C74B3",
    marginRight: 4,
  },
  mapContainer: {
    flex: 1,
    margin: 0,
  },
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default DashboardScreen
