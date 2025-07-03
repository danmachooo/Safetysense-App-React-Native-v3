/* eslint-disable react/no-unstable-nested-components */
'use client';

import {useState, useEffect} from 'react';

import {GOOGLE_API_KEY} from '@env';

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
  Modal,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';

import MapView, {
  Marker,
  type MapPressEvent,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import Geolocation from '@react-native-community/geolocation';

import Geocoder from 'react-native-geocoding';

import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type CameraOptions,
} from 'react-native-image-picker';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {SafeAreaView} from 'react-native-safe-area-context';

import incidentService from '../services/api/incidentService';
import {NetworkInfo} from 'react-native-network-info';

Geocoder.init(GOOGLE_API_KEY);

// Define types for location data
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

// Socorro, Oriental Mindoro coordinates
const DEFAULT_LOCATION: LocationData = {
  latitude: 13.0584,
  longitude: 121.4066,
  address: 'Socorro, Oriental Mindoro, Philippines',
};

const ReportIncidentScreen = () => {
  const navigation = useNavigation<any>(); // Type as any for now, ideally use proper navigation typing

  const [image, setImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<string>('');
  const [reportedBy, setReportedBy] = useState<string>(''); // Added for name
  const [contact, setContact] = useState<string>(''); // Added for contact
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] =
    useState<boolean>(false);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);

  // Modal states
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Get current location on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Update location when permission is granted
  useEffect(() => {
    if (isLocationPermissionGranted) {
      getLocation();
    } else {
      console.log('Location permission not granted, using default');
      setLocation(DEFAULT_LOCATION);
      setMapRegion(prev => ({
        ...prev,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      }));
    }
  }, [isLocationPermissionGranted]);

  // Update requestLocationPermission to handle async properly
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        Geolocation.requestAuthorization();
        setIsLocationPermissionGranted(true);
        return;
      } catch (error) {
        console.warn('iOS location permission error:', error);
        setIsLocationPermissionGranted(false);
        return;
      }
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location Permission Granted!');
        setIsLocationPermissionGranted(true);
      } else {
        console.log('Location Permission Denied');
        setIsLocationPermissionGranted(false);
        setLocation(DEFAULT_LOCATION);
        setMapRegion(prev => ({
          ...prev,
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
        }));
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      setIsLocationPermissionGranted(false);
      setLocation(DEFAULT_LOCATION);
      setMapRegion(prev => ({
        ...prev,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      }));
    }
  };

  const getLocation = () => {
    console.log('Getting current location...');
    setIsLocationLoading(true);

    // Set a timeout to handle cases where Geolocation.getCurrentPosition might hang
    const locationTimeout = setTimeout(() => {
      console.log('Location request taking too long, using default location');
      setIsLocationLoading(false);
      setLocation(DEFAULT_LOCATION);
      setMapRegion(prev => ({
        ...prev,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      }));
    }, 20000); // 20 seconds timeout as a fallback

    Geolocation.getCurrentPosition(
      async position => {
        // Clear the timeout since we got a position
        clearTimeout(locationTimeout);
        const {latitude, longitude} = position.coords;
        console.log('Current position retrieved:', {latitude, longitude});

        try {
          // Reverse geocode coords
          const json = await Geocoder.from(latitude, longitude);
          const address =
            json.results[0]?.formatted_address || 'Unknown Location';

          // Update both location and mapRegion
          const locationData = {
            latitude,
            longitude,
            address,
          };

          console.log('Location retrieved successfully:', locationData);
          setLocation(locationData);
          setMapRegion(prev => ({
            ...prev,
            latitude,
            longitude,
          }));
        } catch (error) {
          console.log('Geocoding error: ', error);
          // Still set the location even if geocoding fails
          const locationData = {
            latitude,
            longitude,
            address: 'Unknown Location',
          };
          setLocation(locationData);
          setMapRegion(prev => ({
            ...prev,
            latitude,
            longitude,
          }));
        } finally {
          setIsLocationLoading(false);
        }
      },
      error => {
        // Clear the timeout since we got an error response
        clearTimeout(locationTimeout);
        console.log('Location retrieval error:', error);
        // On error, set to default
        setIsLocationLoading(false);
        setLocation(DEFAULT_LOCATION);
        setMapRegion(prev => ({
          ...prev,
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
        }));
      },
      {
        enableHighAccuracy: false, // Set to false to prioritize faster response over accuracy
        timeout: 15000,
        maximumAge: 60000, // Accept positions up to 1 minute old
      },
    );
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to take photos of incidents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take photos. Please enable it in settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
      }

      return false;
    } catch (err) {
      console.error('Camera permission error:', err);
      return false;
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true, // Optional: save to camera roll
        cameraType: 'back',
      };

      const result = await new Promise<ImagePickerResponse>(resolve => {
        launchCamera(options, resolve);
      });

      if (result.didCancel) {
        console.log('User cancelled camera');
      } else if (result.errorCode) {
        Alert.alert(
          'Camera Error',
          result.errorMessage || 'Failed to access camera',
        );
      } else if (result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleChoosePhoto = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (
        response.assets &&
        response.assets.length > 0 &&
        response.assets[0].uri
      ) {
        setImage(response.assets[0].uri);
      }
    });
  };

  const handleMapPress = (e: MapPressEvent) => {
    if (e.nativeEvent && e.nativeEvent.coordinate) {
      const newLocation = {
        latitude: e.nativeEvent.coordinate.latitude,
        longitude: e.nativeEvent.coordinate.longitude,
        address: 'Selected Location', // This would be replaced with reverse geocoding
      };

      console.log('Location selected on map:', newLocation);
      setLocation(newLocation);

      // Attempt to reverse geocode the selected location
      Geocoder.from(newLocation.latitude, newLocation.longitude)
        .then(json => {
          const address =
            json.results[0]?.formatted_address || 'Selected Location';
          const updatedLocation = {
            ...newLocation,
            address,
          };
          console.log('Reverse geocoded address:', address);
          setLocation(updatedLocation);
        })
        .catch(error => console.warn('Reverse geocoding error:', error));
    }
  };

  // Function to upload image to server
  const uploadImage = async (imageUri: string): Promise<string | null> => {
    if (!imageUri) {
      return null;
    }

    try {
      console.log('Starting image upload, URI:', imageUri);
      setUploadProgress(0);

      // Use the service to upload the image, with a progress callback
      const imageUrl = await incidentService.uploadImage(imageUri, progress => {
        setUploadProgress(progress);
        console.log(`Upload progress: ${progress}%`);
      });

      console.log('Image upload successful, URL:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadProgress(0);
    }
  };

  // Handle initial submit button press - show confirmation modal
  const handleSubmitPress = () => {
    if (!incidentType.trim()) {
      Alert.alert('Error', 'Please select an incident type');
      console.log('Submission failed: No incident type selected');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide an incident description');
      console.log('Submission failed: No description provided');
      return;
    }

    if (!location) {
      Alert.alert(
        'Error',
        'Location is required. Please wait for GPS or select a location on the map.',
      );
      console.log('Submission failed: No location selected');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Handle actual submission after confirmation
  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      // Upload image if exists
      let imageUrl = null;
      if (image) {
        // Show uploading status in UI
        Alert.alert(
          'Uploading Image',
          'Please wait while we upload your photo...',
          [{text: 'OK'}],
          {cancelable: false},
        );

        try {
          imageUrl = await uploadImage(image);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          const continueWithoutImage = await new Promise(resolve => {
            Alert.alert(
              'Warning',
              'Failed to upload image. Do you want to continue without the image?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'Continue',
                  onPress: () => resolve(true),
                },
              ],
              {cancelable: false},
            );
          });

          if (!continueWithoutImage) {
            setLoading(false);
            return;
          }

          // If continuing without image, use a placeholder URL that will pass validation
          imageUrl = 'https://placeholder.com/no-image-available.jpg';
        }
      } else {
        // If no image was selected, use a placeholder URL that will pass validation
        imageUrl = 'https://placeholder.com/no-image-available.jpg';
      }

      const ipAddress = await NetworkInfo.getIPAddress();

      const submissionData = {
        ipAddress,
        reportedBy, // Optional name
        contact, // Optional contact
        type: incidentType,
        snapshotUrl: imageUrl, // Use the URL returned from server or placeholder
        description,
        longitude: location!.longitude.toString(),
        latitude: location!.latitude.toString(),
      };

      console.log('DATA BEING SENT TO BACKEND:', submissionData);

      const result = await incidentService.submitCitizenReport(submissionData);

      if (result.success) {
        setLoading(false);
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Authorities have been notified.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Navigating back to Login screen');
                navigation.navigate('Login');
              },
            },
          ],
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const incidentTypes = [
    {id: 'Fire', label: 'Fire', icon: 'fire'},
    {id: 'Medical', label: 'Medical', icon: 'medical-bag'},
    {id: 'Accident', label: 'Accident', icon: 'car-emergency'},
    {id: 'Crime', label: 'Crime', icon: 'alert-octagon'},
    {id: 'Flood', label: 'Flood', icon: 'water'},
    {id: 'Other', label: 'Other', icon: 'dots-horizontal'},
  ];

  // Welcome Modal Component
  const WelcomeModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showWelcomeModal}
      onRequestClose={() => setShowWelcomeModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={40}
                color="#4CAF50"
              />
            </View>
            <Text style={styles.modalTitle}>Welcome to SafetySense!</Text>
            <Text style={styles.modalSubtitle}>
              Help keep your community safe by reporting incidents
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {/* Terms Agreement */}
            <View style={styles.agreementSection}>
              <Text style={styles.agreementText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </View>

            {/* Privacy Section */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={24}
                  color="#2196F3"
                />
                <Text style={styles.privacyTitle}>We respect your privacy</Text>
              </View>

              <View style={styles.privacyList}>
                <View style={styles.privacyItem}>
                  <MaterialCommunityIcons
                    name="account-off-outline"
                    size={20}
                    color="#8BABC7"
                  />
                  <Text style={styles.privacyItemText}>
                    Your reports are anonymous by default
                  </Text>
                </View>

                <View style={styles.privacyItem}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={20}
                    color="#8BABC7"
                  />
                  <Text style={styles.privacyItemText}>
                    Your location is only used to identify where the incident
                    occurred
                  </Text>
                </View>

                <View style={styles.privacyItem}>
                  <MaterialCommunityIcons
                    name="security"
                    size={20}
                    color="#8BABC7"
                  />
                  <Text style={styles.privacyItemText}>
                    IP addresses are logged to prevent spam or abuse
                  </Text>
                </View>
              </View>
            </View>

            {/* Warning Section */}
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={24}
                  color="#FF9800"
                />
                <Text style={styles.warningTitle}>Important Notice</Text>
              </View>
              <Text style={styles.warningText}>
                Reports may be shared with authorized responders (e.g., MDRRMO)
                to assist in emergencies.
              </Text>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowWelcomeModal(false)}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>I Understand, Continue</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Confirmation Modal Component
  const ConfirmationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showConfirmModal}
      onRequestClose={() => setShowConfirmModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View
              style={[styles.modalIconContainer, styles.warningIconContainer]}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={40}
                color="#FF5722"
              />
            </View>
            <Text style={styles.modalTitle}>Confirm Your Report</Text>
            <Text style={styles.modalSubtitle}>
              Please review the information below before submitting
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {/* Terms Reminder */}
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#2196F3"
                />
                <Text style={styles.confirmationTitle}>Terms & Privacy</Text>
              </View>
              <Text style={styles.confirmationText}>
                By submitting this report, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </View>

            {/* Location Sharing */}
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <MaterialCommunityIcons
                  name="map-marker-radius"
                  size={24}
                  color="#4CAF50"
                />
                <Text style={styles.confirmationTitle}>Location Sharing</Text>
              </View>
              <Text style={styles.confirmationText}>
                Your location will be shared with authorized responders to help
                with emergency response.
              </Text>
            </View>

            {/* Warning */}
            <View style={styles.finalWarningCard}>
              <View style={styles.finalWarningHeader}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={24}
                  color="#FF5722"
                />
                <Text style={styles.finalWarningTitle}>Important Reminder</Text>
              </View>
              <Text style={styles.finalWarningText}>
                Please do not submit false or misleading information. False
                reports may result in legal consequences.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowConfirmModal(false)}
              activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleConfirmedSubmit}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.dangerButtonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />

      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Confirmation Modal */}
      <ConfirmationModal />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Incident</Text>
        </View>

        {/* Personal Information Section - ADDED */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons
              name="account-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text> Personal Information (Optional)</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name (optional)"
              placeholderTextColor="#8D9CB8"
              value={reportedBy}
              onChangeText={setReportedBy}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone or email (optional)"
              placeholderTextColor="#8D9CB8"
              value={contact}
              onChangeText={setContact}
            />
          </View>
        </View>

        {/* Incident Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text> Incident Type</Text>
          </Text>
          <View style={styles.incidentTypesContainer}>
            {incidentTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.incidentTypeButton,
                  incidentType === type.id && styles.incidentTypeButtonActive,
                ]}
                onPress={() => setIncidentType(type.id)}>
                <MaterialCommunityIcons
                  name={type.icon}
                  size={24}
                  color={incidentType === type.id ? '#FFFFFF' : '#8D9CB8'}
                />
                <Text
                  style={[
                    styles.incidentTypeText,
                    incidentType === type.id && styles.incidentTypeTextActive,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons
              name="camera-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text> Photo Evidence</Text>
          </Text>
          <View style={styles.photoContainer}>
            {image ? (
              <View style={styles.imageWrapper}>
                <Image source={{uri: image}} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialCommunityIcons
                  name="camera-plus"
                  size={48}
                  color="#8D9CB8"
                />
                <Text style={styles.placeholderText}>Add photo evidence</Text>
              </View>
            )}
          </View>

          {/* Upload Progress Indicator */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Uploading image: {uploadProgress}%
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[styles.progressBar, {width: `${uploadProgress}%`}]}
                />
              </View>
            </View>
          )}

          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleTakePhoto}>
              <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoButton, styles.uploadButton]}
              onPress={handleChoosePhoto}>
              <MaterialCommunityIcons name="image" size={20} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons
              name="text-box-outline"
              size={20}
              color="#FFFFFF"
            />
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
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text> Location</Text>
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              customMapStyle={darkMapStyle}>
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Incident Location">
                  <View style={styles.customMarker}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={36}
                      color="#E53935"
                    />
                  </View>
                </Marker>
              )}
            </MapView>
            <TouchableOpacity
              style={styles.recenterButton}
              onPress={() => {
                if (isLocationPermissionGranted) {
                  getLocation();
                } else {
                  requestLocationPermission();
                }
              }}>
              {isLocationLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={24}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.locationTextContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={16}
              color="#8D9CB8"
            />
            <Text style={styles.locationText}>
              {isLocationLoading
                ? 'Getting your location...'
                : location
                ? location.address
                : 'Fetching location...'}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitPress}
          disabled={loading}>
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
  );
};

// Dark style for MapView
const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#212121',
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
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
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(19, 47, 76, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#0D2137',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#B8C7D9',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#132F4C',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  incidentTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  incidentTypeButton: {
    width: '30%',
    backgroundColor: '#132F4C',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  incidentTypeButtonActive: {
    backgroundColor: '#1E88E5',
    borderColor: '#64B5F6',
  },
  incidentTypeText: {
    color: '#8D9CB8',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  incidentTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#132F4C',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E4976',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  placeholderText: {
    color: '#8D9CB8',
    marginTop: 12,
    fontSize: 14,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#0D47A1',
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: '#132F4C',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(19, 47, 76, 0.8)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132F4C',
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    color: '#B8C7D9',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // New styles for upload progress
  progressContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#132F4C',
    borderRadius: 8,
  },
  progressText: {
    color: '#FFFFFF',
    marginBottom: 8,
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#0D2137',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1E88E5',
  },

  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0A2647',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#144272',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIconContainer: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8BABC7',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContent: {
    paddingHorizontal: 24,
    maxHeight: 400,
  },

  // Agreement Section
  agreementSection: {
    marginBottom: 24,
  },
  agreementText: {
    fontSize: 16,
    color: '#B8C7D9',
    textAlign: 'center',
    lineHeight: 24,
  },
  linkText: {
    color: '#2196F3',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Privacy Card
  privacyCard: {
    backgroundColor: '#0D2137',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  privacyList: {
    gap: 12,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  privacyItemText: {
    fontSize: 15,
    color: '#B8C7D9',
    lineHeight: 22,
    flex: 1,
  },

  // Warning Card
  warningCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 12,
  },
  warningText: {
    fontSize: 15,
    color: '#FFB74D',
    lineHeight: 22,
  },

  // Confirmation Cards
  confirmationCard: {
    backgroundColor: '#0D2137',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  confirmationText: {
    fontSize: 15,
    color: '#B8C7D9',
    lineHeight: 22,
  },

  // Final Warning Card
  finalWarningCard: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.3)',
    marginBottom: 20,
  },
  finalWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  finalWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5722',
    marginLeft: 12,
  },
  finalWarningText: {
    fontSize: 15,
    color: '#FF8A65',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Button Styles
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    shadowColor: '#2196F3',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#132F4C',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  secondaryButtonText: {
    color: '#B8C7D9',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 2,
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ReportIncidentScreen;
