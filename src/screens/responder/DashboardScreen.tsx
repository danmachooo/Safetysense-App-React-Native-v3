/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-catch-shadow */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable curly */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unstable-nested-components */
'use client';

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  ScrollView,
  Animated,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE, Callout} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import Geocoding from 'react-native-geocoding';
import type {ResponderStackParamList} from '../../navigation/ResponderNavigator';
import type {JSX} from 'react/jsx-runtime';
import incidentService from '../../services/api/incidentService';
import {GOOGLE_API_KEY} from '@env';
import {useAppSelector} from '../../store/hooks';

// Initialize Geocoding
Geocoding.init(GOOGLE_API_KEY);

// Define navigation prop type
type DashboardScreenNavigationProp = StackNavigationProp<
  ResponderStackParamList,
  'DashboardMain'
>;

// View modes
const VIEW_MODES = {
  LIST: 'list',
  MAP: 'map',
} as const;

type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

// Socorro, Oriental Mindoro coordinates
const SOCORRO_COORDINATES = {
  latitude: 13.0584,
  longitude: 121.4066,
};

// Enhanced user location interface
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

// Define incident types with icons and colors
const INCIDENT_TYPES = {
  Fire: {name: 'Fire', icon: 'fire', color: '#FF5252'},
  Medical: {name: 'Medical', icon: 'medical-bag', color: '#2196F3'},
  Accident: {name: 'Accident', icon: 'car-emergency', color: '#FFC107'},
  Flood: {name: 'Flood', icon: 'water', color: '#4CAF50'},
  Crime: {name: 'Crime', icon: 'alert-octagon', color: '#9C27B0'},
  Other: {name: 'Other', icon: 'dots-horizontal', color: '#607D8B'},
};

// Define API incident interface
interface ApiIncident {
  id: number;
  cameraId: number | null;
  reportedBy: string;
  contact: string;
  type: string;
  snapshotUrl: string;
  description: string;
  status: string;
  longitude: string;
  latitude: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: null | string;
  camera: null | any;
  accepters: Array<{
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    contact: string;
    IncidentAcceptance: {
      acceptedAt: string;
    };
  }>;
  dismissers?: Array<{
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    contact: string;
    IncidentDismissal: {
      dismissedAt: string;
      reason?: string;
    };
  }>;
}

// Define incident interface for the app
interface Incident {
  id: number;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timestamp: string;
  image: string;
  type: {
    name: string;
    icon: string;
    color: string;
  };
  status: string;
  reportedBy: string;
  contact: string;
  accepters: Array<{
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    contact: string;
    acceptedAt: string;
  }>;
  dismissers?: Array<{
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    contact: string;
    dismissedAt: string;
    reason?: string;
  }>;
}

// Address cache to avoid redundant API calls
interface AddressCache {
  [key: string]: string;
}

// Google Maps Dark Mode Style
const mapDarkStyle = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#9e9e9e',
      },
    ],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#bdbdbd',
      },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      {
        color: '#181818',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#1b1b1b',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [
      {
        color: '#2c2c2c',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#8a8a8a',
      },
    ],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [
      {
        color: '#373737',
      },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [
      {
        color: '#3c3c3c',
      },
    ],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [
      {
        color: '#4e4e4e',
      },
    ],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      {
        color: '#000000',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#3d3d3d',
      },
    ],
  },
];

const {width, height} = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.04;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.LIST);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<
    string | null
  >(null);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [dismissedIncidentIds, setDismissedIncidentIds] = useState<number[]>(
    [],
  );

  // Heatmap states
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<
    Array<[number, number, number]>
  >([]);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
  const [heatmapFilter, setHeatmapFilter] = useState<string>('last7days');
  const [heatmapType, setHeatmapType] = useState<string>('');
  const [showHeatmapControls, setShowHeatmapControls] =
    useState<boolean>(false);

  // Enhanced location states
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] =
    useState<boolean>(false);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedIncidentForRoute, setSelectedIncidentForRoute] =
    useState<Incident | null>(null);
  const [showRoutes, setShowRoutes] = useState<boolean>(false);

  const mapRef = useRef<MapView | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const locationWatchId = useRef<number | null>(null);

  const {user} = useAppSelector(state => state.auth);

  // Address cache to minimize API calls
  const addressCache = useRef<AddressCache>({});

  // Enhanced address formatting function from ReportIncidentScreen
  const formatHumanReadableAddress = (result: any): string => {
    const addressComponents = result.address_components;
    const formattedAddress = result.formatted_address;

    // Helper function to find component by type
    const findComponent = (types: string[]) => {
      return addressComponents.find((comp: any) =>
        types.some((type: string) => comp.types.includes(type)),
      );
    };

    // Extract specific components with enhanced detection
    const streetNumber = findComponent(['street_number'])?.long_name || '';
    const route = findComponent(['route'])?.long_name || '';

    // Enhanced barangay detection
    let barangay =
      findComponent([
        'sublocality_level_1',
        'sublocality_level_2',
        'sublocality',
        'neighborhood',
        'political',
      ])?.long_name || '';

    // Enhanced city detection
    let city =
      findComponent([
        'locality',
        'administrative_area_level_2',
        'administrative_area_level_3',
        'sublocality_level_1',
      ])?.long_name || '';

    const municipality =
      findComponent(['administrative_area_level_2'])?.long_name || '';
    const province =
      findComponent(['administrative_area_level_1'])?.long_name || '';

    // Clean and validate components
    const cleanComponent = (component: string) => {
      if (!component) {
        return '';
      }
      return component
        .replace(/\b(City|Municipality|Poblacion|Proper)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Fix common misclassifications
    if (barangay && barangay.toLowerCase().includes('city')) {
      if (!city || city === barangay) {
        city = barangay;
        barangay = '';
      }
    }

    // Use municipality as city if city is not available
    if (!city && municipality) {
      city = municipality;
    }

    // Remove duplicates
    if (barangay && city && barangay.toLowerCase() === city.toLowerCase()) {
      barangay = '';
    }

    // Build address parts
    const addressParts = [];

    // Add street address
    if (streetNumber && route) {
      const cleanRoute = cleanComponent(route);
      if (cleanRoute && !cleanRoute.toLowerCase().includes('unnamed')) {
        addressParts.push(`${streetNumber} ${cleanRoute}`);
      }
    } else if (route) {
      const cleanRoute = cleanComponent(route);
      if (cleanRoute && !cleanRoute.toLowerCase().includes('unnamed')) {
        addressParts.push(cleanRoute);
      }
    }

    // Add barangay with proper formatting
    if (barangay) {
      const cleanBarangay = cleanComponent(barangay);
      if (
        cleanBarangay &&
        cleanBarangay.toLowerCase() !== city?.toLowerCase() &&
        !cleanBarangay.toLowerCase().includes('city') &&
        cleanBarangay.length > 2
      ) {
        // Add proper prefix
        const barangayFormatted =
          cleanBarangay.toLowerCase().startsWith('barangay') ||
          cleanBarangay.toLowerCase().startsWith('brgy')
            ? cleanBarangay
            : `Brgy. ${cleanBarangay}`;
        addressParts.push(barangayFormatted);
      }
    }

    // Add city/municipality
    if (city) {
      const cleanCity = cleanComponent(city);
      if (cleanCity) {
        // Add "City" suffix if it's a city but doesn't have it
        const cityFormatted = cleanCity.toLowerCase().includes('city')
          ? cleanCity
          : `${cleanCity} City`;
        addressParts.push(cityFormatted);
      }
    }

    // Add province if different and meaningful
    if (province && province.toLowerCase() !== city?.toLowerCase()) {
      const cleanProvince = cleanComponent(province);
      if (
        cleanProvince &&
        cleanProvince.toLowerCase() !== city?.toLowerCase()
      ) {
        addressParts.push(cleanProvince);
      }
    }

    // Build final address
    let humanReadableAddress = '';
    if (addressParts.length > 0) {
      humanReadableAddress = addressParts.join(', ');
    } else {
      // Enhanced fallback cleaning
      humanReadableAddress = formattedAddress
        .replace(/^\d+\+\w+\s*/, '') // Remove plus codes
        .replace(/,\s*Philippines$/i, '') // Remove Philippines suffix
        .replace(/,\s*Unnamed Road/gi, '') // Remove unnamed roads
        .replace(/,\s*Poblacion/gi, '') // Remove generic Poblacion
        .replace(/\b(Municipality)\b/gi, '') // Remove Municipality word
        .replace(/,\s*,/g, ',') // Fix double commas
        .replace(/^\s*,\s*/, '') // Remove leading comma
        .replace(/\s*,\s*$/, '') // Remove trailing comma
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    }

    // Final validation and formatting
    if (!humanReadableAddress || humanReadableAddress.length < 5) {
      // Last resort: use available meaningful parts
      const fallbackParts = [city, province].filter(
        part => part && part.trim() && !part.toLowerCase().includes('unnamed'),
      );
      humanReadableAddress =
        fallbackParts.length > 0
          ? fallbackParts.join(', ')
          : 'Current Location';
    }

    // Proper case formatting
    humanReadableAddress = humanReadableAddress
      .split(' ')
      .map(word => {
        // Handle special cases
        if (
          word.toLowerCase() === 'brgy.' ||
          word.toLowerCase() === 'st.' ||
          word.toLowerCase() === 'ave.'
        ) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return humanReadableAddress;
  };

  const fetchHeatmapData = useCallback(async () => {
    try {
      setHeatmapLoading(true);
      setError(null); // Clear previous errors
      console.log('🔥 Fetching heatmap data...');

      // Construct filters object
      const filters: Record<string, string> = {};
      if (heatmapFilter) filters.filter = heatmapFilter;
      if (heatmapType) filters.type = heatmapType;

      const response = await incidentService.getHeatmapData(filters);

      if (response.success) {
        console.log(
          `✅ Successfully fetched heatmap data: ${response.data.length} points`,
        );
        setHeatmapData(response.data as any);
      } else {
        console.error('❌ Heatmap API Error:', response.message);
        setError(
          `Failed to fetch heatmap data: ${
            response.message || 'Unknown error'
          }`,
        );
        Alert.alert(
          'Error',
          `Failed to fetch heatmap data: ${
            response.message || 'Unknown error'
          }`,
        );
      }
    } catch (err: any) {
      console.error('❌ Error fetching heatmap data:', err);
      const errorMessage =
        err.message || 'Failed to fetch heatmap data. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setHeatmapLoading(false);
    }
  }, [heatmapFilter, heatmapType]);

  useEffect(() => {
    if (showHeatmap) {
      fetchHeatmapData();
    }
  }, [heatmapFilter, heatmapType]);

  // Enhanced location permission request
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      try {
        await Geolocation.requestAuthorization();
        setIsLocationPermissionGranted(true);
        setLocationError(null);
        console.log('Location Permission Granted!');
        return true;
      } catch (error) {
        console.warn('iOS location permission error:', error);
        setIsLocationPermissionGranted(false);
        setLocationError('Location permission denied');
        return false;
      }
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message:
            'This app requires precise location access to show your position on the map and provide accurate directions to incidents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setIsLocationPermissionGranted(isGranted);
      if (isGranted) {
        console.log('Location Permission Granted!');
        setLocationError(null);
        return true;
      } else {
        console.log('Location Permission Denied');
        setLocationError(
          'Location permission is required for accurate positioning',
        );
        Alert.alert(
          'Location Permission Required',
          'This app cannot show your position without location access. Please enable location permissions in settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
        return false;
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      setIsLocationPermissionGranted(false);
      setLocationError('Failed to request location permission');
      return false;
    }
  };
  // Enhanced location success handler
  const handleLocationSuccess = async (position: any) => {
    const {latitude, longitude, accuracy} = position.coords;
    console.log('Enhanced location retrieved:', {
      latitude,
      longitude,
      accuracy,
    });

    // Provide feedback based on accuracy
    if (accuracy > 100) {
      console.warn('Location accuracy is very low:', accuracy, 'meters');
      setLocationError(
        `Location accuracy: ${Math.round(
          accuracy,
        )}m - Very low accuracy. Consider moving to an open area for better precision.`,
      );
    } else if (accuracy > 50) {
      console.warn('Location accuracy is moderate:', accuracy, 'meters');
      setLocationError(
        `Location accuracy: ${Math.round(
          accuracy,
        )}m - Moderate accuracy. Moving to an open area may improve precision.`,
      );
    } else {
      console.log('Good location accuracy:', accuracy, 'meters');
      setLocationError(null);
    }

    try {
      // Reverse geocode coordinates with enhanced formatting
      const json = await Geocoding.from(latitude, longitude);
      let humanReadableAddress = 'Current Location';

      if (json.results && json.results.length > 0) {
        const result = json.results[0];
        humanReadableAddress = formatHumanReadableAddress(result);
        console.log('Enhanced address formatting result:', {
          original: result.formatted_address,
          humanReadable: humanReadableAddress,
          components: result.address_components,
        });
      }

      const locationData: UserLocation = {
        latitude,
        longitude,
        accuracy,
        address: humanReadableAddress,
      };

      console.log('Enhanced location set successfully:', locationData);
      setUserLocation(locationData);

      // Cache the address for future use
      const cacheKey = `${latitude},${longitude}`;
      addressCache.current[cacheKey] = humanReadableAddress;
    } catch (error) {
      console.log('Enhanced geocoding error: ', error);
      // Still set the location even if geocoding fails
      const locationData: UserLocation = {
        latitude,
        longitude,
        accuracy,
        address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`, // Show coordinates as fallback
      };
      setUserLocation(locationData);
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Enhanced location error handler
  const handleLocationError = (error: any) => {
    console.log('Enhanced location retrieval error:', error);
    setIsLocationLoading(false);

    let errorMessage = 'Failed to get current location';
    let actionMessage = '';

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = 'Location permission denied';
        actionMessage =
          'Please enable location permissions in settings to continue.';
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = 'Location unavailable';
        actionMessage =
          'Please check your GPS settings and ensure you have a clear view of the sky.';
        break;
      case 3: // TIMEOUT
        errorMessage = 'Location request timed out';
        actionMessage =
          'Please try again or move to an area with better GPS reception.';
        break;
      case 4: // ACTIVITY_NULL (Android specific)
        errorMessage = 'GPS service unavailable';
        actionMessage =
          'Please enable GPS/Location services in your device settings.';
        break;
      default:
        errorMessage = 'Unknown location error';
        actionMessage = 'Please try again or restart the app.';
    }

    setLocationError(`${errorMessage} - ${actionMessage}`);

    Alert.alert(
      'Location Required',
      `${errorMessage}. ${actionMessage}\n\nThis app requires your location to show your position and provide directions.`,
      [
        {text: 'Try Again', onPress: getCurrentLocation},
        {
          text: 'Settings',
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  };

  const getCurrentLocation = useCallback(() => {
    console.log(
      'getCurrentLocation called with isLocationPermissionGranted:',
      isLocationPermissionGranted,
    );
    if (!isLocationPermissionGranted) {
      console.log(
        'Location permission not granted, skipping location request.',
      );
      return;
    }
    if (!isLocationPermissionGranted) {
      console.log(
        'Location permission not granted, skipping location request.',
      );
      // Do not call requestLocationPermission here; handle it in initializeEnhancedLocation
      return;
    }

    console.log('Getting enhanced current location...');
    setIsLocationLoading(true);
    setLocationError(null);

    const attemptLocationRequest = (attemptNumber = 1) => {
      const maxAttempts = 3;
      const options = {
        enableHighAccuracy: attemptNumber === 1,
        timeout: attemptNumber === 1 ? 20000 : 15000,
        maximumAge: attemptNumber === 1 ? 30000 : 60000,
      };

      console.log(
        `Enhanced location request attempt ${attemptNumber}/${maxAttempts} with options:`,
        options,
      );

      Geolocation.getCurrentPosition(
        position => {
          console.log(
            `Enhanced location request successful on attempt ${attemptNumber}`,
          );
          handleLocationSuccess(position);
        },
        error => {
          console.log(
            `Enhanced location request failed on attempt ${attemptNumber}:`,
            error,
          );
          if (attemptNumber < maxAttempts) {
            console.log(
              `Retrying enhanced location request (attempt ${
                attemptNumber + 1
              })...`,
            );
            setLocationError(
              `Location attempt ${attemptNumber} failed, retrying with different settings...`,
            );
            setTimeout(() => {
              attemptLocationRequest(attemptNumber + 1);
            }, 1000);
          } else {
            handleLocationError(error);
          }
        },
        options,
      );
    };

    attemptLocationRequest(1);
  }, [isLocationPermissionGranted]);
  // Watch user location for real-time updates
  const watchUserLocation = useCallback(() => {
    if (!isLocationPermissionGranted) return;

    locationWatchId.current = Geolocation.watchPosition(
      position => {
        const {latitude, longitude, accuracy} = position.coords;
        console.log('Enhanced location updated:', {
          latitude,
          longitude,
          accuracy,
        });

        // Update location with enhanced address formatting
        handleLocationSuccess(position);
      },
      error => {
        console.error('Error watching enhanced location:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
      },
    );
  }, [isLocationPermissionGranted]);

  const isRequestingPermissionRef = useRef(false);

  const initializeEnhancedLocation = useCallback(async () => {
    if (isRequestingPermissionRef.current) {
      console.log('Already requesting permission, skipping...');
      return;
    }

    console.log('Initializing enhanced location services...');
    isRequestingPermissionRef.current = true;

    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        getCurrentLocation();
        watchUserLocation();
      }
    } finally {
      isRequestingPermissionRef.current = false;
    }
  }, [getCurrentLocation, watchUserLocation]);
  // Toggle route display
  const toggleRoutes = () => {
    setShowRoutes(!showRoutes);
    console.log('Routes display toggled:', !showRoutes);
  };

  // Toggle heatmap display
  const toggleHeatmap = () => {
    const newHeatmapState = !showHeatmap;
    setShowHeatmap(newHeatmapState);
    console.log('Heatmap display toggled:', newHeatmapState);

    if (newHeatmapState && heatmapData.length === 0) {
      fetchHeatmapData();
    }

    // Hide routes when showing heatmap
    if (newHeatmapState && showRoutes) {
      setShowRoutes(false);
    }
  };

  // Toggle heatmap controls
  const toggleHeatmapControls = () => {
    setShowHeatmapControls(!showHeatmapControls);
  };

  // Update heatmap filter
  const updateHeatmapFilter = (filter: string, type = '') => {
    setHeatmapFilter(filter);
    setHeatmapType(type);
    console.log('Heatmap filter updated:', {filter, type});
  };

  // Get bubble size based on intensity
  const getBubbleSize = (intensity: number): number => {
    const minSize = 40; // ⬆️ from 20
    const maxSize = 120; // ⬆️ from 80
    const capped = Math.min(intensity, 15);
    return minSize + ((maxSize - minSize) * capped) / 15;
  };

  // Get bubble color based on intensity
  const getBubbleColor = (intensity: number) => {
    let baseColor = '255, 255, 255'; // fallback

    if (intensity >= 15) baseColor = '255, 0, 0'; // 🔴 red
    else if (intensity >= 10) baseColor = '255, 100, 0'; // 🟠 orange red
    else if (intensity >= 7) baseColor = '255, 165, 0'; // 🟠 orange
    else if (intensity >= 5) baseColor = '255, 215, 0'; // 🟡 gold
    else if (intensity >= 3) baseColor = '144, 238, 144'; // 🟢 light green
    else baseColor = '173, 190, 230'; // 🔵 light blue

    return {
      fill: `rgba(${baseColor}, 0.2)`, // soft background
      border: `rgba(${baseColor}, 0.8)`, // bold outline
    };
  };

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, []);

  // Reverse geocoding function to get address from coordinates
  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      // Check cache first
      const cacheKey = `${latitude},${longitude}`;
      if (addressCache.current[cacheKey]) {
        return addressCache.current[cacheKey];
      }

      // If no API key is provided, return a default message
      if (!GOOGLE_API_KEY) {
        return 'Location information unavailable';
      }

      const response = await Geocoding.from(latitude, longitude);
      let address = 'Location information unavailable';

      if (response.results && response.results.length > 0) {
        // Use enhanced address formatting
        const result = response.results[0];
        address = formatHumanReadableAddress(result);
        // Cache the result
        addressCache.current[cacheKey] = address;
      }

      return address;
    } catch (error: any) {
      console.error('Error in reverse geocoding:', error.origin);
      return 'Error retrieving location';
    }
  };

  // Render heatmap bubbles
  const renderHeatmapBubblesMarkers = () => {
    if (!showHeatmap || heatmapData.length === 0) return null;

    return heatmapData.map((point, index) => {
      const [latitude, longitude, intensity] = point;
      const bubbleSize = getBubbleSize(intensity);
      const {fill, border} = getBubbleColor(intensity);

      <View
        style={{
          width: bubbleSize,
          height: bubbleSize,
          backgroundColor: fill, // 🟦 soft inner fill
          borderColor: border, // 🟥 bold outer ring
          borderWidth: 3,
          borderRadius: bubbleSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: border,
            fontWeight: 'bold',
            fontSize: 12,
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: {width: 1, height: 1},
            textShadowRadius: 1,
          }}>
          {intensity}
        </Text>
      </View>;

      return (
        <Marker
          key={`heatmap-${index}`}
          coordinate={{latitude, longitude}}
          title={'Incident Hotspot'}
          description={`Intensity: ${intensity} incidents`}>
          <Animated.View
            style={{
              width: bubbleSize,
              height: bubbleSize,
              backgroundColor: fill, // 🟦 soft inner fill
              borderColor: border, // 🟥 bold outer ring
              borderWidth: 1,
              borderRadius: bubbleSize / 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {intensity > 1 && (
              <Text
                style={{
                  color: border,
                  fontWeight: 'normal',
                  fontSize: 12,
                  textShadowColor: 'rgba(0, 0, 0, 0.5)',
                  textShadowOffset: {width: 1, height: 1},
                  textShadowRadius: 1,
                }}>
                {intensity}
              </Text>
            )}
          </Animated.View>
        </Marker>
      );
    });
  };

  // Render heatmap controls
  const renderHeatmapControlsFilters = () => {
    if (!showHeatmapControls) return null;

    const filterOptions = [
      {id: 'last7days', label: '7 Days', icon: 'calendar-week'},
      {id: 'last30days', label: '30 Days', icon: 'calendar-month'},
      {id: 'last90days', label: '90 Days', icon: 'calendar-range'},
    ];

    const typeOptions = [
      {id: '', label: 'All Types', icon: 'filter-variant'},
      {id: 'fire', label: 'Fire', icon: 'fire'},
      {id: 'medical', label: 'Medical', icon: 'medical-bag'},
      {id: 'accident', label: 'Accident', icon: 'car-emergency'},
      {id: 'crime', label: 'Crime', icon: 'alert-octagon'},
      {id: 'flood', label: 'Flood', icon: 'water'},
    ];

    return (
      <View style={styles.heatmapControlsOverlay}>
        <View style={styles.heatmapControlsContainer}>
          <View style={styles.heatmapControlsHeader}>
            <Text style={styles.heatmapControlsTitle}>Heatmap Filters</Text>
            <TouchableOpacity onPress={toggleHeatmapControls}>
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.heatmapControlsLabel}>Time Period</Text>
            <View style={styles.heatmapFilterRow}>
              {filterOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.heatmapFilterButton,
                    heatmapFilter === option.id &&
                      styles.heatmapFilterButtonActive,
                  ]}
                  onPress={() => updateHeatmapFilter(option.id, heatmapType)}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={16}
                    color={heatmapFilter === option.id ? '#FFFFFF' : '#8BABC7'}
                  />
                  <Text
                    style={[
                      styles.heatmapFilterButtonText,
                      heatmapFilter === option.id &&
                        styles.heatmapFilterButtonTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.heatmapControlsLabel}>Incident Type</Text>
            <View style={styles.heatmapFilterRow}>
              {typeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.heatmapFilterButton,
                    heatmapType === option.id &&
                      styles.heatmapFilterButtonActive,
                  ]}
                  onPress={() => updateHeatmapFilter(heatmapFilter, option.id)}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={16}
                    color={heatmapType === option.id ? '#FFFFFF' : '#8BABC7'}
                  />
                  <Text
                    style={[
                      styles.heatmapFilterButtonText,
                      heatmapType === option.id &&
                        styles.heatmapFilterButtonTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => {
                fetchHeatmapData();
                setShowHeatmapControls(false);
              }}
              disabled={heatmapLoading}>
              {heatmapLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.applyFiltersButtonText}>
                    Apply Filters
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  };

  // Render heatmap legend
  const renderHeatmapLegendInfo = () => {
    if (!showHeatmap) return null;

    const legendItems = [
      {color: 'rgba(255, 0, 0, 0.7)', label: '15+ Very High', range: '15+'},
      {color: 'rgba(255, 69, 0, 0.7)', label: '10-14 High', range: '10-14'},
      {color: 'rgba(255, 140, 0, 0.7)', label: '7-9 Med-High', range: '7-9'},
      {color: 'rgba(255, 165, 0, 0.7)', label: '5-6 Medium', range: '5-6'},
      {color: 'rgba(255, 215, 0, 0.7)', label: '3-4 Low-Med', range: '3-4'},
      {color: 'rgba(173, 255, 47, 0.7)', label: '1-2 Low', range: '1-2'},
    ];

    return (
      <View style={styles.heatmapLegendOverlay}>
        <Text style={styles.heatmapLegendTitle}>Incident Intensity</Text>
        {legendItems.map((item, index) => (
          <View key={index} style={styles.heatmapLegendItem}>
            <View
              style={[styles.heatmapLegendColor, {backgroundColor: item.color}]}
            />
            <Text style={styles.heatmapLegendText}>{item.range}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Function to transform API incident to app incident format
  const transformIncident = async (
    apiIncident: ApiIncident,
  ): Promise<Incident> => {
    // Get incident type info or use default
    const typeInfo =
      INCIDENT_TYPES[apiIncident.type as keyof typeof INCIDENT_TYPES] ||
      INCIDENT_TYPES.Other;

    // Fix image URL if needed
    const imageUrl = apiIncident.snapshotUrl;
    if (imageUrl && imageUrl.startsWith('https')) {
      console.log('URL Image: ', imageUrl);
    }

    // Transform accepters
    const transformedAccepters = apiIncident.accepters.map(accepter => ({
      id: accepter.id,
      firstname: accepter.firstname,
      lastname: accepter.lastname,
      email: accepter.email,
      contact: accepter.contact,
      acceptedAt: accepter.IncidentAcceptance.acceptedAt,
    }));

    // Transform dismissers if available
    const transformedDismissers = apiIncident.dismissers
      ? apiIncident.dismissers.map(dismisser => ({
          id: dismisser.id,
          firstname: dismisser.firstname,
          lastname: dismisser.lastname,
          email: dismisser.email,
          contact: dismisser.contact,
          dismissedAt: dismisser.IncidentDismissal.dismissedAt,
          reason: dismisser.IncidentDismissal.reason,
        }))
      : [];

    // Parse coordinates
    const latitude = Number.parseFloat(apiIncident.latitude);
    const longitude = Number.parseFloat(apiIncident.longitude);

    // Get address from coordinates (default to "Fetching location..." while we wait)
    let address = 'Fetching location...';
    try {
      address = await getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      console.error('Error getting address:', error);
      address = 'Location unavailable';
    }

    return {
      id: apiIncident.id,
      title: `${apiIncident.type} Incident`, // Create a title from the type
      description: apiIncident.description,
      location: {
        latitude,
        longitude,
        address,
      },
      timestamp: apiIncident.createdAt,
      image: imageUrl,
      type: typeInfo,
      status: apiIncident.status,
      reportedBy: apiIncident.reportedBy,
      contact: apiIncident.contact,
      accepters: transformedAccepters,
      dismissers: transformedDismissers,
    };
  };

  // Update dismissed incidents list
  const updateDismissedIncidents = useCallback(
    (incidentsList: Incident[]) => {
      if (!user?.id) return;

      // Extract IDs of incidents dismissed by the current user
      const dismissedIds = incidentsList
        .filter(
          incident =>
            incident.dismissers &&
            incident.dismissers.some(dismisser => dismisser.id === user.id),
        )
        .map(incident => incident.id);

      console.log(
        `Found ${dismissedIds.length} incidents dismissed by user ${user.id}`,
      );
      setDismissedIncidentIds(dismissedIds);
    },
    [user?.id],
  );

  // Fetch incidents from API
  const fetchIncidents = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isRefreshingRef.current) {
      console.log('Already refreshing, skipping duplicate fetch');
      return;
    }

    try {
      isRefreshingRef.current = true;
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching incidents from API...');

      const response = await incidentService.getIncidents();
      if (response.success) {
        console.log(
          `✅ Successfully fetched ${response.data.length} incidents`,
        );

        // Transform incidents one by one (to handle async address lookup)
        const transformPromises = response.data.map(transformIncident);
        const transformedIncidents = await Promise.all(transformPromises);

        // Update the dismissed incidents list before setting the incidents
        updateDismissedIncidents(transformedIncidents);
        setIncidents(transformedIncidents);
      } else {
        console.error('❌ API Error:', response.message);
        setError('Failed to fetch incidents: ' + response.message);
      }
    } catch (err) {
      console.error('❌ Error fetching incidents:', err);
      setError('Failed to fetch incidents. Please try again.');
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [updateDismissedIncidents]);

  // Initial data fetch and enhanced location setup
  useEffect(() => {
    console.log('Dashboard initializing with enhanced location...');
    Geocoding.init(GOOGLE_API_KEY);
    initializeEnhancedLocation();
    fetchIncidents();

    return () => {
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
        console.log('Enhanced location watch cleared');
      }
    };
  }, [fetchIncidents]); // Remove initializeEnhancedLocation from dependencies

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard screen focused - scheduling auto refresh');
      const refreshTimer = setTimeout(() => {
        console.log('🔄 Executing delayed auto refresh');
        fetchIncidents();
        if (isLocationPermissionGranted) {
          getCurrentLocation(); // Only refresh location if permission is granted
        }
      }, 300);

      return () => {
        clearTimeout(refreshTimer);
        console.log('Dashboard screen unfocused - cleared refresh timer');
      };
    }, [fetchIncidents, isLocationPermissionGranted, getCurrentLocation]),
  );

  // Function to format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  // Format date for display
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
  };

  // Navigate to incident details
  const handleIncidentPress = (incident: Incident): void => {
    console.log('Navigating to incident details:', incident.id, incident.title);
    // Pass the source parameter to indicate this is from the dashboard (pending incidents)
    navigation.navigate('IncidentDetails', {
      incident,
      source: 'dashboard',
    });
  };

  // Handle incident marker press (for route display)
  const handleIncidentMarkerPress = (incident: Incident): void => {
    setSelectedIncidentForRoute(incident);
    console.log('Selected incident for route:', incident.id);
  };

  // Toggle between list and map view
  const toggleViewMode = (): void => {
    const newMode =
      viewMode === VIEW_MODES.LIST ? VIEW_MODES.MAP : VIEW_MODES.LIST;
    console.log('Switching view mode to:', newMode);
    setViewMode(newMode);
  };

  // Filter incidents by type
  const filterIncidents = (
    type: string | null,
    filterId: string | number,
  ): void => {
    console.log(
      'Filtering incidents by type:',
      type,
      'with filter ID:',
      filterId,
    );
    setSelectedIncidentType(type);
    setSelectedFilterId(filterId.toString());
  };

  // Check if incident is dismissed by current user
  const isIncidentDismissedByUser = (incident: Incident): boolean => {
    // First check the cached dismissedIncidentIds for better performance
    if (dismissedIncidentIds.includes(incident.id)) {
      return true;
    }

    // Also check if status is 'dismissed'
    if (incident.status === 'dismissed') {
      return true;
    }

    // Fallback to checking the incident.dismissers array
    if (!user?.id || !incident.dismissers) return false;
    return incident.dismissers.some(dismisser => dismisser.id === user.id);
  };

  // Get filtered incidents
  const getFilteredIncidents = (): Incident[] => {
    console.log(
      'Filtering incidents. Total:',
      incidents.length,
      'Current user ID:',
      user?.id,
      'Dismissed IDs:',
      dismissedIncidentIds.length,
    );

    // First filter out incidents dismissed by the current user
    const nonDismissedIncidents = incidents.filter(
      incident => !isIncidentDismissedByUser(incident),
    );

    console.log('After dismissal filter:', nonDismissedIncidents.length);

    // Then apply type filter if selected
    if (!selectedIncidentType) {
      return nonDismissedIncidents;
    }

    const typeFiltered = nonDismissedIncidents.filter(
      incident => incident.type?.name === selectedIncidentType,
    );

    console.log('After type filter:', typeFiltered.length);
    return typeFiltered;
  };

  // Handle refresh
  const onRefresh = async (): Promise<void> => {
    console.log('Manual refresh triggered by pull-to-refresh');
    // If already refreshing, don't trigger another refresh
    if (refreshing || isRefreshingRef.current) {
      console.log('Already refreshing, skipping duplicate refresh');
      return;
    }

    setRefreshing(true);
    try {
      await fetchIncidents();
      // Also refresh location
      if (isLocationPermissionGranted) {
        getCurrentLocation();
      }
      console.log('✅ Manual refresh completed successfully');
    } catch (err) {
      console.error('❌ Error during manual refresh:', err);
      setError('Failed to refresh incidents. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Center map on Socorro
  const centerMapOnSocorro = () => {
    console.log('Centering map on Socorro, Oriental Mindoro');
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: SOCORRO_COORDINATES.latitude,
        longitude: SOCORRO_COORDINATES.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  // Center map on user location
  const centerMapOnUserLocation = () => {
    console.log('Centering map on user location');
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  // Get status badge color based on status
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'accepted':
        return '#2C74B3'; // Blue
      case 'resolved':
        return '#4CAF50'; // Green
      case 'pending':
        return '#FFC107'; // Yellow/Amber
      case 'dismissed':
        return '#FF5252'; // Red
      default:
        return '#8BABC7'; // Default gray
    }
  };

  // Render incident card
  const renderIncidentCard = ({item}: {item: Incident}): JSX.Element => {
    const isDismissedByUser = isIncidentDismissedByUser(item);
    const isDismissedStatus = item.status === 'dismissed';
    const isDisabled = isDismissedByUser || isDismissedStatus;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isDisabled && styles.cardDisabled, // Add disabled styling
        ]}
        onPress={() => !isDisabled && handleIncidentPress(item)} // Disable press if dismissed
        activeOpacity={isDisabled ? 1 : 0.7} // Remove press feedback if disabled
        testID={`incident-card-${item.id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View
              style={[
                styles.incidentTypeIndicator,
                {backgroundColor: item.type?.color || '#2C74B3'},
                isDisabled && styles.incidentTypeIndicatorDisabled,
              ]}
            />
            <Text
              style={[
                styles.cardTitle,
                isDisabled && styles.cardTitleDisabled,
              ]}>
              {item.title}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={isDisabled ? '#5A5A5A' : '#8BABC7'}
            />
            <Text
              style={[styles.cardTime, isDisabled && styles.cardTimeDisabled]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            <Image
              source={{uri: item.image}}
              style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
              resizeMode="cover"
            />
            {item.type && (
              <View
                style={[
                  styles.incidentTypeIcon,
                  {backgroundColor: item.type.color},
                  isDisabled && styles.incidentTypeIconDisabled,
                ]}>
                <MaterialCommunityIcons
                  name={item.type.icon}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <Text
              style={[
                styles.cardDescription,
                isDisabled && styles.cardDescriptionDisabled,
              ]}
              numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.locationContainer}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={isDisabled ? '#5A5A5A' : '#2C74B3'}
                />
                <Text
                  style={[
                    styles.cardLocation,
                    isDisabled && styles.cardLocationDisabled,
                  ]}
                  numberOfLines={1}>
                  {item.location.address}
                </Text>
              </View>
              <Text
                style={[
                  styles.cardDate,
                  isDisabled && styles.cardDateDisabled,
                ]}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reporterContainer}>
          <View style={styles.reporterInfoContainer}>
            <View style={styles.reporterDetail}>
              <Text
                style={[
                  styles.reporterLabel,
                  isDisabled && styles.reporterLabelDisabled,
                ]}>
                Reported by:
              </Text>
              <Text
                style={[
                  styles.reporterName,
                  isDisabled && styles.reporterNameDisabled,
                ]}>
                {item.reportedBy}
              </Text>
            </View>
            <View style={styles.reporterDetail}>
              <Text
                style={[
                  styles.contactLabel,
                  isDisabled && styles.contactLabelDisabled,
                ]}>
                Contact:
              </Text>
              <Text
                style={[
                  styles.reporterContact,
                  isDisabled && styles.reporterContactDisabled,
                ]}>
                {item.contact}
              </Text>
            </View>
          </View>
          {item.status && (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDismissedStatus
                    ? '#FF5252'
                    : getStatusBadgeColor(item.status),
                },
              ]}>
              <Text style={styles.statusText}>
                {isDismissedStatus
                  ? 'Dismissed'
                  : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Show different button text for dismissed incidents */}
        <TouchableOpacity
          style={[
            styles.viewDetailsButton,
            isDisabled && styles.viewDetailsButtonDisabled,
          ]}
          onPress={() => !isDisabled && handleIncidentPress(item)}
          disabled={isDisabled}
          testID={`view-details-${item.id}`}>
          <Text
            style={[
              styles.viewDetailsText,
              isDisabled && styles.viewDetailsTextDisabled,
            ]}>
            {isDismissedStatus ? 'Dismissed' : 'View Details'}
          </Text>
          {!isDisabled && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color="#2C74B3"
            />
          )}
          {isDismissedStatus && (
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color="#FF5252"
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render map markers
  const renderMapMarkers = () => {
    const filteredIncidents = getFilteredIncidents();
    return filteredIncidents.map(incident => (
      <Marker
        key={incident.id}
        coordinate={{
          latitude: incident.location.latitude,
          longitude: incident.location.longitude,
        }}
        title={incident.title}
        description={incident.description}
        onPress={() => handleIncidentMarkerPress(incident)}
        onCalloutPress={() => handleIncidentPress(incident)}>
        <View style={styles.markerContainer}>
          <MaterialCommunityIcons
            name={incident.type?.icon || 'alert-circle'}
            size={30}
            color={incident.type?.color || '#E53935'}
          />
        </View>
        <Callout tooltip>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle}>{incident.title}</Text>
            <Text style={styles.calloutDescription} numberOfLines={2}>
              {incident.description}
            </Text>
            <Text style={styles.calloutAddress} numberOfLines={2}>
              {incident.location.address}
            </Text>
            <View style={styles.calloutFooter}>
              <Text style={styles.calloutTime}>
                {formatTime(incident.timestamp)}
              </Text>
              <Text style={styles.calloutViewDetails}>Tap to view details</Text>
            </View>
          </View>
        </Callout>
      </Marker>
    ));
  };

  // Render enhanced user location marker
  const renderUserLocationMarker = () => {
    if (!userLocation) return null;

    return (
      <Marker
        coordinate={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        title="Your Location"
        description={userLocation.address || 'You are here'}>
        <View style={styles.userLocationMarker}>
          <View style={styles.userLocationInner}>
            <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
          </View>
          {userLocation.accuracy && userLocation.accuracy > 50 && (
            <View style={styles.accuracyIndicator}>
              <Text style={styles.accuracyText}>
                ±{Math.round(userLocation.accuracy)}m
              </Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  // Render routes from user location to incidents
  const renderRoutes = () => {
    if (!showRoutes || !userLocation || !GOOGLE_API_KEY) return null;

    const filteredIncidents = getFilteredIncidents();

    // If a specific incident is selected, show route only to that incident
    const incidentsToRoute = selectedIncidentForRoute
      ? [selectedIncidentForRoute]
      : filteredIncidents.slice(0, 3); // Limit to first 3 incidents to avoid too many routes

    return incidentsToRoute.map(incident => (
      <MapViewDirections
        key={`route-${incident.id}`}
        origin={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        destination={{
          latitude: incident.location.latitude,
          longitude: incident.location.longitude,
        }}
        apikey={GOOGLE_API_KEY}
        strokeWidth={4}
        strokeColor={incident.type?.color || '#2C74B3'}
        strokeColors={[incident.type?.color || '#2C74B3']}
        lineDashPattern={
          selectedIncidentForRoute?.id === incident.id ? [] : [10, 10]
        }
        onStart={params => {
          console.log(
            `Started routing between "${params.origin}" and "${params.destination}"`,
          );
        }}
        onReady={result => {
          console.log(`Distance: ${result.distance} km`);
          console.log(`Duration: ${result.duration} min.`);

          // If this is the selected incident route, fit the map to show the entire route
          if (selectedIncidentForRoute?.id === incident.id && mapRef.current) {
            mapRef.current.fitToCoordinates(result.coordinates, {
              edgePadding: {
                right: 50,
                bottom: 50,
                left: 50,
                top: 50,
              },
              animated: true,
            });
          }
        }}
        onError={errorMessage => {
          console.error('MapViewDirections Error:', errorMessage);
        }}
      />
    ));
  };

  // Render filter chips
  const renderFilterChips = () => {
    const incidentTypes = Object.values(INCIDENT_TYPES);
    return (
      <View style={styles.filterContainer}>
        <ScrollableChips
          items={[
            {id: 'all', label: 'All', icon: 'filter-variant'},
            ...incidentTypes,
          ]}
          selectedItemId={selectedFilterId}
          onSelectItem={(item, id) => filterIncidents(item, id)}
        />
      </View>
    );
  };

  // Scrollable chips component
  const ScrollableChips = ({
    items,
    selectedItemId,
    onSelectItem,
  }: {
    items: Array<{
      id?: string | number;
      name?: string;
      label?: string;
      icon: string;
      color?: string;
    }>;
    selectedItemId: string | number;
    onSelectItem: (item: string | null, id: string) => void;
  }) => (
    <FlatList
      horizontal
      data={items}
      keyExtractor={item => `${item.id || item.name || ''}`}
      showsHorizontalScrollIndicator={false}
      renderItem={({item}) => {
        const isSelected = selectedItemId === (item.id || item.name || '');
        return (
          <TouchableOpacity
            style={[
              styles.filterChip,
              isSelected && styles.filterChipSelected,
              item.color && isSelected && {backgroundColor: item.color},
            ]}
            onPress={() => {
              const itemId = item.id || item.name || '';
              const itemValue =
                item.id === 'all' ? null : item.name || item.label || null;
              onSelectItem(itemValue, itemId.toString());
            }}>
            <MaterialCommunityIcons
              name={item.icon}
              size={16}
              color={isSelected ? '#FFFFFF' : item.color || '#8BABC7'}
            />
            <Text
              style={[
                styles.filterChipText,
                isSelected && styles.filterChipTextSelected,
              ]}>
              {item.name || item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.filterChipsContainer}
    />
  );

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={24} color="#FF5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchIncidents}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render refresh indicator overlay
  const renderRefreshIndicator = () => {
    if (!refreshing) return null;

    return (
      <View style={styles.refreshOverlay}>
        <View style={styles.refreshIndicatorContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.refreshText}>Refreshing...</Text>
        </View>
      </View>
    );
  };

  // Render location status overlay
  const renderLocationStatus = () => {
    if (!isLocationLoading && !locationError) return null;

    return (
      <View style={styles.locationStatusOverlay}>
        <View style={styles.locationStatusContainer}>
          {isLocationLoading && (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.locationStatusText}>
                Getting your location...
              </Text>
            </>
          )}
          {locationError && (
            <>
              <MaterialCommunityIcons
                name="map-marker-off"
                size={16}
                color="#FF5252"
              />
              <Text style={styles.locationErrorText} numberOfLines={2}>
                {locationError}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // Update dismissed incidents when user ID or incidents change
  useEffect(() => {
    if (user?.id && incidents.length > 0) {
      updateDismissedIncidents(incidents);
    }
  }, [user?.id, incidents, updateDismissedIncidents]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons
              name="bell-ring-outline"
              size={22}
              color="#2C74B3"
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>Incoming Reports</Text>
            {userLocation && (
              <View style={styles.locationIndicator}>
                <MaterialCommunityIcons
                  name="map-marker-check"
                  size={16}
                  color="#4CAF50"
                />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={toggleViewMode}
            testID="view-toggle-button">
            <MaterialCommunityIcons
              name={
                viewMode === VIEW_MODES.LIST ? 'map' : 'format-list-bulleted'
              }
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {renderFilterChips()}

        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#2C74B3"
            style={styles.loader}
          />
        ) : error ? (
          renderError()
        ) : viewMode === VIEW_MODES.LIST ? (
          <FlatList
            data={getFilteredIncidents()}
            renderItem={renderIncidentCard}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2C74B3']}
                tintColor="#2C74B3"
                progressBackgroundColor="#0A2647"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color="#144272"
                />
                <Text style={styles.emptyText}>No incidents found</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              customMapStyle={mapDarkStyle}
              initialRegion={{
                latitude:
                  userLocation?.latitude || SOCORRO_COORDINATES.latitude,
                longitude:
                  userLocation?.longitude || SOCORRO_COORDINATES.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
              }}
              showsUserLocation={false} // We'll use our custom marker
              showsMyLocationButton={false}>
              {showHeatmap ? renderHeatmapBubblesMarkers() : renderMapMarkers()}
              {renderUserLocationMarker()}
              {!showHeatmap && renderRoutes()}
            </MapView>

            <View style={styles.mapOverlay}>
              <TouchableOpacity style={styles.mapButton} onPress={onRefresh}>
                <MaterialCommunityIcons
                  name="refresh"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mapButton,
                  !userLocation && styles.mapButtonDisabled,
                ]}
                onPress={centerMapOnUserLocation}
                disabled={!userLocation}>
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={22}
                  color={userLocation ? '#FFFFFF' : '#5A5A5A'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapButton}
                onPress={centerMapOnSocorro}>
                <MaterialCommunityIcons
                  name="home-map-marker"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mapButton,
                  showRoutes && styles.mapButtonActive,
                  !userLocation && styles.mapButtonDisabled,
                ]}
                onPress={toggleRoutes}
                disabled={!userLocation}>
                <MaterialCommunityIcons
                  name="directions"
                  size={22}
                  color={userLocation ? '#FFFFFF' : '#5A5A5A'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mapButton,
                  showHeatmap && styles.mapButtonActive,
                ]}
                onPress={toggleHeatmap}>
                <MaterialCommunityIcons name="fire" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {showHeatmap && (
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={toggleHeatmapControls}>
                  <MaterialCommunityIcons
                    name="tune"
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}

              {selectedIncidentForRoute && (
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setSelectedIncidentForRoute(null)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}

              {!isLocationPermissionGranted && (
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={requestLocationPermission}>
                  <MaterialCommunityIcons
                    name="map-marker-plus"
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Route info overlay */}
            {selectedIncidentForRoute && (
              <View style={styles.routeInfoOverlay}>
                <Text style={styles.routeInfoTitle}>
                  Route to: {selectedIncidentForRoute.title}
                </Text>
                <Text style={styles.routeInfoAddress}>
                  {selectedIncidentForRoute.location.address}
                </Text>
              </View>
            )}

            {/* User location info overlay */}
            {userLocation && userLocation.address && (
              <View style={styles.userLocationOverlay}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={16}
                  color="#2C74B3"
                />
                <Text style={styles.userLocationText} numberOfLines={1}>
                  {userLocation.address}
                </Text>
              </View>
            )}

            {/* Render heatmap controls */}
            {renderHeatmapControlsFilters()}

            {/* Render heatmap legend */}
            {renderHeatmapLegendInfo()}
          </View>
        )}

        {/* Render refresh indicator overlay */}
        {renderRefreshIndicator()}

        {/* Render location status overlay */}
        {renderLocationStatus()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Heatmap styles
  heatmapBubble: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8, // for Android
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',

    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  heatmapControlsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 38, 71, 0.95)',
    borderRadius: 12,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#144272',
    zIndex: 100,
  },
  heatmapControlsContainer: {
    padding: 16,
  },
  heatmapControlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  heatmapControlsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heatmapControlsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  heatmapFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  heatmapFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2137',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#144272',
    minWidth: 80,
  },
  heatmapFilterButtonActive: {
    backgroundColor: '#2C74B3',
    borderColor: '#64B5F6',
  },
  heatmapFilterButtonText: {
    color: '#8BABC7',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  heatmapFilterButtonTextActive: {
    color: '#FFFFFF',
  },
  applyFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C74B3',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  applyFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  heatmapLegendOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(10, 38, 71, 0.9)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#144272',
    minWidth: 120,
  },
  heatmapLegendTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  heatmapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heatmapLegendText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0A2647',
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  locationIndicator: {
    marginLeft: 8,
  },
  viewToggle: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#144272',
  },
  filterContainer: {
    backgroundColor: '#0A2647',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2137',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#144272',
  },
  filterChipSelected: {
    backgroundColor: '#2C74B3',
    borderColor: '#64B5F6',
  },
  filterChipText: {
    color: '#8BABC7',
    fontSize: 14,
    marginLeft: 6,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#0A2647',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#144272',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentTypeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2137',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardTime: {
    fontSize: 12,
    color: '#8BABC7',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#144272',
  },
  incidentTypeIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A2647',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardDescription: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardLocation: {
    fontSize: 12,
    color: '#8BABC7',
    marginLeft: 4,
    flex: 1,
  },
  cardDate: {
    fontSize: 12,
    color: '#8BABC7',
    fontWeight: '500',
  },
  reporterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#144272',
    backgroundColor: '#0D2137',
    gap: 8,
  },
  reporterInfoContainer: {
    flex: 1,
    gap: 4,
  },
  reporterDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reporterLabel: {
    fontSize: 12,
    color: '#8BABC7',
  },
  reporterName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  contactLabel: {
    fontSize: 12,
    color: '#8BABC7',
  },
  reporterContact: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#144272',
    backgroundColor: '#0D2137',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C74B3',
    marginRight: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'column',
  },
  mapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A2647',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#144272',
  },
  mapButtonActive: {
    backgroundColor: '#2C74B3',
    borderColor: '#64B5F6',
  },
  mapButtonDisabled: {
    backgroundColor: '#0A1F35',
    borderColor: '#0A1F35',
  },
  userLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 116, 179, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userLocationInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2C74B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyIndicator: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  accuracyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  routeInfoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(10, 38, 71, 0.9)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#144272',
  },
  routeInfoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routeInfoAddress: {
    color: '#8BABC7',
    fontSize: 12,
  },
  userLocationOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(10, 38, 71, 0.9)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#144272',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  locationStatusOverlay: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 116, 179, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: '90%',
  },
  locationStatusText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  locationErrorText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutContainer: {
    width: 220,
    backgroundColor: '#0A2647',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#144272',
  },
  calloutTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDescription: {
    color: '#E0E0E0',
    fontSize: 12,
    marginBottom: 6,
  },
  calloutAddress: {
    color: '#8BABC7',
    fontSize: 12,
    marginBottom: 8,
  },
  calloutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calloutTime: {
    color: '#8BABC7',
    fontSize: 11,
  },
  calloutViewDetails: {
    color: '#2C74B3',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8BABC7',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2C74B3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  refreshIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 116, 179, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  refreshText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  // Disabled styles for dismissed incidents
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#0A1F35',
  },
  cardTitleDisabled: {
    color: '#5A5A5A',
  },
  cardTimeDisabled: {
    color: '#5A5A5A',
  },
  cardDescriptionDisabled: {
    color: '#5A5A5A',
  },
  cardLocationDisabled: {
    color: '#5A5A5A',
  },
  cardDateDisabled: {
    color: '#5A5A5A',
  },
  cardImageDisabled: {
    opacity: 0.5,
  },
  incidentTypeIndicatorDisabled: {
    opacity: 0.5,
  },
  incidentTypeIconDisabled: {
    opacity: 0.7,
  },
  reporterLabelDisabled: {
    color: '#5A5A5A',
  },
  reporterNameDisabled: {
    color: '#5A5A5A',
  },
  contactLabelDisabled: {
    color: '#5A5A5A',
  },
  reporterContactDisabled: {
    color: '#5A5A5A',
  },
  viewDetailsButtonDisabled: {
    backgroundColor: '#0A1F35',
  },
  viewDetailsTextDisabled: {
    color: '#5A5A5A',
  },
});

export default DashboardScreen;
