/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unstable-nested-components */
'use client';

import {useState, useEffect} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE, Callout} from 'react-native-maps';
import type {
  ResponderStackParamList,
  Incident,
  IncidentType,
} from '../../navigation/ResponderNavigator';
import type {JSX} from 'react/jsx-runtime';

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

// Update the incident types definition to match the interface
const INCIDENT_TYPES: Record<string, IncidentType> = {
  FIRE: {name: 'Fire', icon: 'fire', color: '#FF5252'},
  MEDICAL: {name: 'Medical', icon: 'medical-bag', color: '#2196F3'},
  ACCIDENT: {name: 'Accident', icon: 'car-emergency', color: '#FFC107'},
  FLOOD: {name: 'Flood', icon: 'water', color: '#4CAF50'},
  CRIME: {name: 'Crime', icon: 'alert-octagon', color: '#9C27B0'},
  OTHER: {name: 'Other', icon: 'dots-horizontal', color: '#607D8B'},
};

// Mock data for incidents - Updated to Socorro, Oriental Mindoro area
const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1',
    title: 'Traffic Accident',
    description: 'Two-vehicle collision with possible injuries on main highway',
    location: {
      latitude: 13.0584 + 0.01,
      longitude: 121.4066 - 0.005,
      address: 'National Highway, Socorro, Oriental Mindoro',
    },
    timestamp: new Date().toISOString(),
    image: 'https://picsum.photos/id/1002/200/300',
    type: INCIDENT_TYPES.ACCIDENT,
    status: 'Pending',
  },
  {
    id: '2',
    title: 'Medical Emergency',
    description: 'Elderly person needs immediate medical assistance',
    location: {
      latitude: 13.0584 - 0.005,
      longitude: 121.4066 + 0.008,
      address: 'Barangay Pasi, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    image: 'https://picsum.photos/id/1003/200/300',
    type: INCIDENT_TYPES.MEDICAL,
    status: 'Pending',
  },
  {
    id: '3',
    title: 'Fire Reported',
    description:
      'Small fire in residential building, spreading to nearby structures',
    location: {
      latitude: 13.0584 + 0.008,
      longitude: 121.4066 + 0.003,
      address: 'Barangay Catiningan, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    image: 'https://picsum.photos/id/1004/200/300',
    type: INCIDENT_TYPES.FIRE,
    status: 'Pending',
  },
  {
    id: '4',
    title: 'Flooding',
    description:
      'Rising water levels affecting residential area after heavy rainfall',
    location: {
      latitude: 13.0584 - 0.012,
      longitude: 121.4066 - 0.007,
      address: 'Barangay Batong Dalig, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    image: 'https://picsum.photos/id/1015/200/300',
    type: INCIDENT_TYPES.FLOOD,
    status: 'Pending',
  },
  {
    id: '5',
    title: 'Suspicious Activity',
    description: 'Suspicious individuals reported near the community center',
    location: {
      latitude: 13.0584 + 0.005,
      longitude: 121.4066 - 0.01,
      address: 'Community Center, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    image: 'https://picsum.photos/id/1005/200/300',
    type: INCIDENT_TYPES.CRIME,
    status: 'Pending',
  },
  {
    id: '6',
    title: 'Power Outage',
    description:
      'Electrical post damaged, causing power outage in several barangays',
    location: {
      latitude: 13.0584 - 0.008,
      longitude: 121.4066 + 0.012,
      address: 'Barangay Mabini, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    image: 'https://picsum.photos/id/1006/200/300',
    type: INCIDENT_TYPES.OTHER,
    status: 'Pending',
  },
];

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
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.LIST);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<
    string | null
  >(null);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('all');

  useEffect(() => {
    console.log(
      'Default location set to Socorro, Oriental Mindoro:',
      SOCORRO_COORDINATES,
    );
  }, []);

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
  const filterIncidents = (type: string | null, filterId: string): void => {
    console.log(
      'Filtering incidents by type:',
      type,
      'with filter ID:',
      filterId,
    );
    setSelectedIncidentType(type);
    setSelectedFilterId(filterId);
  };

  // Get filtered incidents
  const getFilteredIncidents = (): Incident[] => {
    if (!selectedIncidentType) {
      return incidents;
    }
    return incidents.filter(
      incident => incident.type?.name === selectedIncidentType,
    );
  };

  // Handle refresh
  const onRefresh = (): void => {
    console.log('Refreshing incident data');
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  // Center map on Socorro
  const centerMapOnSocorro = () => {
    console.log('Centering map on Socorro, Oriental Mindoro');
    // This would be implemented with a ref to the MapView component
    // For now, it's just a placeholder
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
            <Text style={styles.calloutAddress}>
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
      id?: string;
      name?: string;
      label?: string;
      icon: string;
      color?: string;
    }>;
    selectedItemId: string;
    onSelectItem: (item: string | null, id: string) => void;
  }) => (
    <FlatList
      horizontal
      data={items}
      keyExtractor={item => item.id || item.name || ''}
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
              onSelectItem(itemValue, itemId);
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

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2C74B3"
            style={styles.loader}
          />
        ) : viewMode === VIEW_MODES.LIST ? (
          <FlatList
            data={getFilteredIncidents()}
            renderItem={renderIncidentCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2C74B3']}
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
});

export default DashboardScreen;
