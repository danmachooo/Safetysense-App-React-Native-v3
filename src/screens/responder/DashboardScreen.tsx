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
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE, Callout} from 'react-native-maps';
import Geocoding from 'react-native-geocoding';
import type {ResponderStackParamList} from '../../navigation/ResponderNavigator';
import type {JSX} from 'react/jsx-runtime';
import incidentService from '../../services/api/incidentService';
import {GOOGLE_API_KEY, BASE_URL} from '@env';
import {useAppSelector} from '../../store/hooks';

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
  const mapRef = useRef<MapView | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const {user} = useAppSelector(state => state.auth);

  // Address cache to minimize API calls
  const addressCache = useRef<AddressCache>({});

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
        // Get the most detailed address (usually the first result)
        const result = response.results[0];

        // Extract the formatted address
        address = result.formatted_address;

        // Cache the result
        addressCache.current[cacheKey] = address;
      }

      return address;
      // eslint-disable-next-line no-catch-shadow
    } catch (error: any) {
      console.error('Error in reverse geocodinggg:', error.origin);
      return 'Error retrieving location';
    }
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
    let imageUrl = apiIncident.snapshotUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      // Assuming your API base URL is defined somewhere
      const baseUrl = BASE_URL;
      imageUrl = `${baseUrl}:3000/${imageUrl}`;
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
      // eslint-disable-next-line no-catch-shadow
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

  // Initial data fetch
  useEffect(() => {
    Geocoding.init(GOOGLE_API_KEY);
    fetchIncidents();
  }, [fetchIncidents]);

  // Auto refresh when screen comes into focus (after actions like accept/dismiss)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard screen focused - scheduling auto refresh');

      // Add a small delay to ensure the screen is fully focused before refreshing
      const refreshTimer = setTimeout(() => {
        console.log('🔄 Executing delayed auto refresh');
        fetchIncidents();
      }, 300);

      return () => {
        // Cleanup function when screen loses focus
        clearTimeout(refreshTimer);
        console.log('Dashboard screen unfocused - cleared refresh timer');
      };
    }, [fetchIncidents]),
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
  const renderIncidentCard = ({item}: {item: Incident}): JSX.Element => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleIncidentPress(item)}
      activeOpacity={0.7}
      testID={`incident-card-${item.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <View
            style={[
              styles.incidentTypeIndicator,
              {backgroundColor: item.type?.color || '#2C74B3'},
            ]}
          />
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color="#8BABC7"
          />
          <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.image}}
            style={styles.cardImage}
            resizeMode="cover"
          />
          {item.type && (
            <View
              style={[
                styles.incidentTypeIcon,
                {backgroundColor: item.type.color},
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
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color="#2C74B3"
              />
              <Text style={styles.cardLocation} numberOfLines={1}>
                {item.location.address}
              </Text>
            </View>
            <Text style={styles.cardDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reporterContainer}>
        <View style={styles.reporterInfoContainer}>
          <View style={styles.reporterDetail}>
            <Text style={styles.reporterLabel}>Reported by:</Text>
            <Text style={styles.reporterName}>{item.reportedBy}</Text>
          </View>
          <View style={styles.reporterDetail}>
            <Text style={styles.contactLabel}>Contact:</Text>
            <Text style={styles.reporterContact}>{item.contact}</Text>
          </View>
        </View>
        {item.status && (
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusBadgeColor(item.status)},
            ]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.viewDetailsButton}
        onPress={() => handleIncidentPress(item)}
        testID={`view-details-${item.id}`}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color="#2C74B3"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
                latitude: SOCORRO_COORDINATES.latitude,
                longitude: SOCORRO_COORDINATES.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
              }}>
              {renderMapMarkers()}
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
                style={styles.mapButton}
                onPress={centerMapOnSocorro}>
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Render refresh indicator overlay */}
        {renderRefreshIndicator()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1929',
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
});

export default DashboardScreen;
