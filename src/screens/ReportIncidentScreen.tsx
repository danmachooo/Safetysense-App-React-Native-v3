import React, { useState, useEffect } from 'react';
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
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker,  MapPressEvent } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import { launchCamera, launchImageLibrary, ImagePickerResponse, CameraOptions } from 'react-native-image-picker';

Geocoder.init("AIzaSyAQSUzYdtlztj_X4rLggCs7sZ-yJQs6rRg");

// Define types for location data
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const DEFAULT_LOCATION: LocationData = {
  latitude: 13.0584,    // Socorro, Oriental Mindoro coordinates
  longitude: 121.4066,
  address: "Socorro, Oriental Mindoro, Philippines"
};

// Simple custom icon
const CameraIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.cameraBody}>
      <View style={styles.cameraLens} />
    </View>
  </View>
);

const ReportIncidentScreen = () => {
  const navigation = useNavigation<any>(); // Type as any for now, ideally use proper navigation typing
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_LOCATION.latitude,  // Explicitly take coordinates
    longitude: DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Get current location on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    const getLocationWithFallback = async () => {
      try {
        await requestLocationPermission();
      } catch (err) {
        console.log("Location permission failed, using default");
        setLocation(DEFAULT_LOCATION);
        setMapRegion(prev => ({
          ...prev,
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
        }));
      }
    };
    getLocationWithFallback();
  }, []);
  
  
  

// Update requestLocationPermission to handle async properly
const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    try {
      await getLocation();
    } catch (error) {
      throw error;
    }
    return;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log("Permission Granted!");
      await getLocation();
    } else {
      throw new Error("Permission denied");
    }
  } catch (err) {
    console.warn("Location error:", err);
    setLocation(DEFAULT_LOCATION);
    setMapRegion(prev => ({
      ...prev,
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
    }));
    throw err;
  }
};
  
  
  const getLocation = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            //Reverse geocode coords
            const json = await Geocoder.from(latitude, longitude);
            const address = json.results[0]?.formatted_address || "Unknown Location";
          

          // Update both location and mapRegion
          setLocation({
            latitude,
            longitude,
            address
          });
          setMapRegion(prev => ({
            ...prev,
            latitude,
            longitude
          }));
          resolve();
        } catch (error)  {
          console.log("Geocoding error: ", error);
          reject(error);
        }
      },
        (error) => {
          console.log("Location error:", error);
          // On error, set to default and reject
          setLocation(DEFAULT_LOCATION);
          setMapRegion(prev => ({
            ...prev,
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
          }));
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };
  
  

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
  
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "This app needs camera access to take photos of incidents.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert(
          "Permission Required", 
          "Camera access is required to take photos. Please enable it in settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }
      return false;
    } catch (err) {
      console.error("Camera permission error:", err);
      return false;
    }
  };
  
  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;
  
      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,  // Optional: save to camera roll
        cameraType: 'back',
      };
  
      const result = await new Promise<ImagePickerResponse>((resolve) => {
        launchCamera(options, resolve);
      });
  
      if (result.didCancel) {
        console.log('User cancelled camera');
      } else if (result.errorCode) {
        Alert.alert(
          "Camera Error", 
          result.errorMessage || "Failed to access camera"
        );
      } else if (result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const handleChoosePhoto = () => { 
    const options: CameraOptions  = {
      mediaType: 'photo',
      quality: 0.8,
    };
    
    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
        // Fixed line 115 & 121 - Added null check for uri
        setImage(response.assets[0].uri);
      }
    });
  };

  const handleMapPress = (e: MapPressEvent) => {
    // Fixed line 128 - Added type for event and null check
    if (e.nativeEvent && e.nativeEvent.coordinate) {
      setLocation({
        latitude: e.nativeEvent.coordinate.latitude,
        longitude: e.nativeEvent.coordinate.longitude,
        address: "Selected Location" // This would be replaced with reverse geocoding
      });
    }
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please provide an incident description");
      return;
    }
    
    if (!location) {
      Alert.alert("Error", "Location is required. Please wait for GPS or select a location on the map.");
      return;
    }
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. Authorities have been notified.",
        [
          { 
            text: "OK", 
            // Fixed line 156 - Ensure navigation type is correct
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    }, 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>
      
      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Photo Evidence</Text>
        <View style={styles.photoContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <CameraIcon />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>
        <View style={styles.photoButtonsContainer}>
          <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={handleChoosePhoto}>
            <Text style={styles.photoButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✍️ Incident Description</Text>
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
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            customMapStyle={darkMapStyle}
          >
            {location && (
              <Marker
                coordinate={{
                  // Fixed lines 225 & 226 - Added null check
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Incident Location"
              />
            )}
          </MapView>
        </View>
        <Text style={styles.locationText}>
          {/* Fixed line 234 - Added null check */}
          {location ? location.address : "Fetching location..."}
        </Text>
      </View>
      
      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// Dark style for MapView
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1929',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    photoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#132F4C',
        marginBottom: 12,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#8D9CB8',
        marginTop: 8,
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    photoButton: {
        backgroundColor: '#1E88E5',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 0.48,
        alignItems: 'center',
    },
    photoButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    textInput: {
        backgroundColor: '#132F4C',
        borderRadius: 8,
        padding: 12,
        color: '#FFFFFF',
        height: 120,
        textAlignVertical: 'top',
    },
    mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    locationText: {
        color: '#B8C7D9',
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: '#1E88E5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    iconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBody: {
        width: 20,
        height: 16,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraLens: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#132F4C',
        borderWidth: 1,
        borderColor: '#8D9CB8',
    },
});

export default ReportIncidentScreen;