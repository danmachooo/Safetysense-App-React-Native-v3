"use client"

import { useState, useEffect } from "react"
import { GOOGLE_API_KEY } from "@env"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Linking,
  StatusBar,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import MapView, { Marker, type MapPressEvent, PROVIDER_GOOGLE } from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import Geocoder from "react-native-geocoding"
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type CameraOptions,
} from "react-native-image-picker"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { SafeAreaView } from "react-native-safe-area-context"

Geocoder.init(GOOGLE_API_KEY)

// Define types for location data
interface LocationData {
  latitude: number
  longitude: number
  address: string
}

// Socorro, Oriental Mindoro coordinates
const DEFAULT_LOCATION: LocationData = {
  latitude: 13.0584,
  longitude: 121.4066,
  address: "Socorro, Oriental Mindoro, Philippines",
}

const ReportIncidentScreen = () => {
  const navigation = useNavigation<any>() // Type as any for now, ideally use proper navigation typing
  const [image, setImage] = useState<string | null>(null)
  const [description, setDescription] = useState<string>("")
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [incidentType, setIncidentType] = useState<string>("")
  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  })

  // Get current location on component mount
  useEffect(() => {
    requestLocationPermission()
  }, [])

  useEffect(() => {
    const getLocationWithFallback = async () => {
      try {
        await requestLocationPermission()
      } catch (err) {
        console.log("Location permission failed, using default")
        setLocation(DEFAULT_LOCATION)
        console.log("Setting default location:", DEFAULT_LOCATION)
        setMapRegion((prev) => ({
          ...prev,
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
        }))
      }
    }
    getLocationWithFallback()
  }, [])

  // Update requestLocationPermission to handle async properly
  const requestLocationPermission = async () => {
    if (Platform.OS === "ios") {
      try {
        await getLocation()
      } catch (error) {
        throw error
      }
      return
    }

    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permission Granted!")
        await getLocation()
      } else {
        throw new Error("Permission denied")
      }
    } catch (err) {
      console.warn("Location error:", err)
      setLocation(DEFAULT_LOCATION)
      setMapRegion((prev) => ({
        ...prev,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      }))
      throw err
    }
  }

  const getLocation = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            //Reverse geocode coords
            const json = await Geocoder.from(latitude, longitude)
            const address = json.results[0]?.formatted_address || "Unknown Location"

            // Update both location and mapRegion
            const locationData = {
              latitude,
              longitude,
              address,
            }
            console.log("Location retrieved successfully:", locationData)
            setLocation(locationData)
            setMapRegion((prev) => ({
              ...prev,
              latitude,
              longitude,
            }))
            resolve()
          } catch (error) {
            console.log("Geocoding error: ", error)
            reject(error)
          }
        },
        (error) => {
          console.log("Location error:", error)
          // On error, set to default and reject
          setLocation(DEFAULT_LOCATION)
          setMapRegion((prev) => ({
            ...prev,
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
          }))
          reject(error)
        },
        { enableHighAccuracy: true, timeout: 15000 },
      )
    })
  }

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true

    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Camera Permission",
        message: "This app needs camera access to take photos of incidents.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      })

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert("Permission Required", "Camera access is required to take photos. Please enable it in settings.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ])
      }
      return false
    } catch (err) {
      console.error("Camera permission error:", err)
      return false
    }
  }

  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const hasPermission = await requestCameraPermission()
      if (!hasPermission) return

      const options: CameraOptions = {
        mediaType: "photo",
        quality: 0.8,
        saveToPhotos: true, // Optional: save to camera roll
        cameraType: "back",
      }

      const result = await new Promise<ImagePickerResponse>((resolve) => {
        launchCamera(options, resolve)
      })

      if (result.didCancel) {
        console.log("User cancelled camera")
      } else if (result.errorCode) {
        Alert.alert("Camera Error", result.errorMessage || "Failed to access camera")
      } else if (result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Camera error:", error)
      Alert.alert("Error", "Failed to open camera")
    }
  }

  const handleChoosePhoto = () => {
    const options: CameraOptions = {
      mediaType: "photo",
      quality: 0.8,
    }

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log("User cancelled image picker")
      } else if (response.errorCode) {
        console.log("ImagePicker Error: ", response.errorMessage)
      } else if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
        setImage(response.assets[0].uri)
      }
    })
  }

  const handleMapPress = (e: MapPressEvent) => {
    if (e.nativeEvent && e.nativeEvent.coordinate) {
      const newLocation = {
        latitude: e.nativeEvent.coordinate.latitude,
        longitude: e.nativeEvent.coordinate.longitude,
        address: "Selected Location", // This would be replaced with reverse geocoding
      }
      console.log("Location selected on map:", newLocation)
      setLocation(newLocation)

      // Attempt to reverse geocode the selected location
      Geocoder.from(newLocation.latitude, newLocation.longitude)
        .then((json) => {
          const address = json.results[0]?.formatted_address || "Selected Location"
          const updatedLocation = {
            ...newLocation,
            address,
          }
          console.log("Reverse geocoded address:", address)
          setLocation(updatedLocation)
        })
        .catch((error) => console.warn("Reverse geocoding error:", error))
    }
  }

  const handleSubmit = () => {
    if (!incidentType.trim()) {
      Alert.alert("Error", "Please select an incident type")
      console.log("Submission failed: No incident type selected")
      return
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please provide an incident description")
      console.log("Submission failed: No description provided")
      return
    }

    if (!location) {
      Alert.alert("Error", "Location is required. Please wait for GPS or select a location on the map.")
      console.log("Submission failed: No location selected")
      return
    }

    // Prepare submission data for logging
    const submissionData = {
      incidentType,
      description,
      location,
      hasImage: image !== null,
      imageUri: image,
      timestamp: new Date().toISOString(),
    }

    console.log("Preparing to submit incident report:", submissionData)
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log("Incident report submitted successfully:", submissionData)
      setLoading(false)
      Alert.alert("Report Submitted", "Thank you for your report. Authorities have been notified.", [
        {
          text: "OK",
          onPress: () => {
            console.log("Navigating back to Login screen")
            navigation.navigate("Login")
          },
        },
      ])
    }, 2000)
  }

  const incidentTypes = [
    { id: "fire", label: "Fire", icon: "fire" },
    { id: "medical", label: "Medical", icon: "medical-bag" },
    { id: "accident", label: "Accident", icon: "car-emergency" },
    { id: "crime", label: "Crime", icon: "alert-octagon" },
    { id: "flood", label: "Flood", icon: "water" },
    { id: "other", label: "Other", icon: "dots-horizontal" },
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Incident</Text>
        </View>

        {/* Incident Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FFFFFF" />
            <Text> Incident Type</Text>
          </Text>
          <View style={styles.incidentTypesContainer}>
            {incidentTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.incidentTypeButton, incidentType === type.id && styles.incidentTypeButtonActive]}
                onPress={() => setIncidentType(type.id)}
              >
                <MaterialCommunityIcons
                  name={type.icon}
                  size={24}
                  color={incidentType === type.id ? "#FFFFFF" : "#8D9CB8"}
                />
                <Text style={[styles.incidentTypeText, incidentType === type.id && styles.incidentTypeTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="camera-outline" size={20} color="#FFFFFF" />
            <Text> Photo Evidence</Text>
          </Text>
          <View style={styles.photoContainer}>
            {image ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                  <MaterialCommunityIcons name="close-circle" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialCommunityIcons name="camera-plus" size={48} color="#8D9CB8" />
                <Text style={styles.placeholderText}>Add photo evidence</Text>
              </View>
            )}
          </View>
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoButton, styles.uploadButton]} onPress={handleChoosePhoto}>
              <MaterialCommunityIcons name="image" size={20} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="text-box-outline" size={20} color="#FFFFFF" />
            <Text> Incident Description</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe what happened..."
            placeholderTextColor="#8D9CB8"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#FFFFFF" />
            <Text> Location</Text>
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              customMapStyle={darkMapStyle}
            >
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Incident Location"
                >
                  <View style={styles.customMarker}>
                    <MaterialCommunityIcons name="map-marker" size={36} color="#E53935" />
                  </View>
                </Marker>
              )}
            </MapView>
            <TouchableOpacity style={styles.recenterButton} onPress={() => requestLocationPermission()}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.locationTextContainer}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#8D9CB8" />
            <Text style={styles.locationText}>{location ? location.address : "Fetching location..."}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

// Dark style for MapView
const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#bdbdbd",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#181818",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#1b1b1b",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#2c2c2c",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#8a8a8a",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#3c3c3c",
      },
    ],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [
      {
        color: "#4e4e4e",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#3d3d3d",
      },
    ],
  },
]

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(19, 47, 76, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 16,
  },
  section: {
    marginBottom: 28,
    backgroundColor: "#0D2137",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  incidentTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  incidentTypeButton: {
    width: "30%",
    backgroundColor: "#132F4C",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E4976",
  },
  incidentTypeButtonActive: {
    backgroundColor: "#1E88E5",
    borderColor: "#64B5F6",
  },
  incidentTypeText: {
    color: "#8D9CB8",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  incidentTypeTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  photoContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#132F4C",
    marginBottom: 16,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 4,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1E4976",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  placeholderText: {
    color: "#8D9CB8",
    marginTop: 12,
    fontSize: 14,
  },
  photoButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoButton: {
    backgroundColor: "#1E88E5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  uploadButton: {
    backgroundColor: "#0D47A1",
  },
  photoButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: "#132F4C",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    height: 120,
    textAlignVertical: "top",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#1E4976",
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: "#1E4976",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(19, 47, 76, 0.8)",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#132F4C",
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    color: "#B8C7D9",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: "#1E88E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  customMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
})

export default ReportIncidentScreen
