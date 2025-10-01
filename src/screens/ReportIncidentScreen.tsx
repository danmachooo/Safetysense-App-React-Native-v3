/* eslint-disable react/no-unstable-nested-components */
'use client';
import {useState, useEffect, useCallback} from 'react';
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
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import {
  launchCamera,
  type ImagePickerResponse,
  type CameraOptions,
} from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import incidentService from '../services/api/incidentService';
import {NetworkInfo} from 'react-native-network-info';
import Imageresizer from 'react-native-image-resizer';
Geocoder.init(GOOGLE_API_KEY);

// Define types for location data
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const ReportIncidentScreen = () => {
  const navigation = useNavigation<any>();
  const [image, setImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<string>('');
  const [reportedBy, setReportedBy] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] =
    useState<boolean>(false);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Modal states
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [mapRegion, setMapRegion] = useState({
    latitude: 13.0584, // Initial center, will be updated with user location
    longitude: 121.4066,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const getCurrentLocation = useCallback(() => {
    console.log('Getting current precise location...');
    setIsLocationLoading(true);
    setLocationError(null);

    // Enhanced location request with multiple attempts
    const attemptLocationRequest = (attemptNumber = 1) => {
      const maxAttempts = 3;
      const options = {
        enableHighAccuracy: attemptNumber === 1, // High accuracy on first attempt
        timeout: attemptNumber === 1 ? 20000 : 15000, // Longer timeout for first attempt
        maximumAge: attemptNumber === 1 ? 30000 : 60000, // Accept newer positions on first attempt
      };

      console.log(
        `Location request attempt ${attemptNumber}/${maxAttempts} with options:`,
        options,
      );

      Geolocation.getCurrentPosition(
        position => {
          console.log(
            `Location request successful on attempt ${attemptNumber}`,
          );
          handleLocationSuccess(position);
        },
        error => {
          console.log(
            `Location request failed on attempt ${attemptNumber}:`,
            error,
          );
          if (attemptNumber < maxAttempts) {
            // Try again with different settings
            console.log(
              `Retrying location request (attempt ${attemptNumber + 1})...`,
            );
            setLocationError(
              `Location attempt ${attemptNumber} failed, retrying with different settings...`,
            );
            setTimeout(() => {
              attemptLocationRequest(attemptNumber + 1);
            }, 1000); // Wait 1 second before retry
          } else {
            // All attempts failed
            handleLocationError(error);
          }
        },
        options,
      );
    };

    // Start the location request
    attemptLocationRequest(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current location on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Update location when permission is granted
  useEffect(() => {
    if (isLocationPermissionGranted) {
      getCurrentLocation();
    } else {
      console.log('Location permission not granted');
      setLocationError('Location permission is required to report incidents');
    }
  }, [getCurrentLocation, isLocationPermissionGranted]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        Geolocation.requestAuthorization();
        setIsLocationPermissionGranted(true);
        return;
      } catch (error) {
        console.warn('iOS location permission error:', error);
        setIsLocationPermissionGranted(false);
        setLocationError('Location permission denied');
        return;
      }
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message:
            'This app requires precise location access to accurately report incident locations. Your exact location is essential for emergency response.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location Permission Granted!');
        setIsLocationPermissionGranted(true);
        setLocationError(null);
      } else {
        console.log('Location Permission Denied');
        setIsLocationPermissionGranted(false);
        setLocationError(
          'Location permission is required for accurate incident reporting',
        );
        Alert.alert(
          'Location Permission Required',
          'This app cannot function without precise location access. Please enable location permissions in settings to report incidents.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      setIsLocationPermissionGranted(false);
      setLocationError('Failed to request location permission');
    }
  };

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
    // const country = findComponent(['country'])?.long_name || '';

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

  const handleLocationSuccess = async (position: any) => {
    const {latitude, longitude, accuracy} = position.coords;
    console.log('Precise location retrieved:', {latitude, longitude, accuracy});

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
      // Reverse geocode coordinates with enhanced settings
      const json = await Geocoder.from(latitude, longitude);
      let humanReadableAddress = 'Current Location';

      if (json.results && json.results.length > 0) {
        const result = json.results[0];
        humanReadableAddress = formatHumanReadableAddress(result);
        console.log('Address formatting result:', {
          original: result.formatted_address,
          humanReadable: humanReadableAddress,
          components: result.address_components,
        });
      }

      const locationData = {
        latitude,
        longitude,
        address: humanReadableAddress,
      };

      console.log('Location set successfully:', locationData);
      setLocation(locationData);
      setMapRegion(prev => ({
        ...prev,
        latitude,
        longitude,
        latitudeDelta: 0.005, // Zoom in for precise location
        longitudeDelta: 0.005,
      }));
    } catch (error) {
      console.log('Geocoding error: ', error);
      // Still set the location even if geocoding fails
      const locationData = {
        latitude,
        longitude,
        address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`, // Show coordinates as fallback
      };
      setLocation(locationData);
      setMapRegion(prev => ({
        ...prev,
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }));
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleLocationError = (error: any) => {
    console.log('Final location retrieval error:', error);
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
      `${errorMessage}. ${actionMessage}\n\nThis app requires your exact location to report incidents accurately.`,
      [
        {text: 'Try Again', onPress: getCurrentLocation},
        {
          text: 'Settings',
          onPress: () => Linking.openSettings(),
        },
      ],
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
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
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

  // Function to upload image to server
  const uploadImage = async (imageUri: string): Promise<string | null> => {
    if (!imageUri) return null;

    try {
      console.log('Starting image upload, URI:', imageUri);

      // Compress image before uploading
      const compressedImage = await Imageresizer.createResizedImage(
        imageUri,
        1920, // max width
        1920, // max height
        'JPEG',
        80, // quality (0-100)
        0, // rotation
      );

      console.log('Image compressed:', compressedImage.uri);
      setUploadProgress(0);

      const imageUrl = await incidentService.uploadImage(
        compressedImage.uri,
        progress => {
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        },
      );

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
        'Location Required',
        'Your exact location is required to report incidents. Please wait for GPS to acquire your location or try refreshing.',
      );
      console.log('Submission failed: No location available');
      return;
    }

    setShowConfirmModal(true);
  };

  // Handle actual submission after confirmation
  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    let finalImageUrl: string | null =
      'https://placeholder.com/no-image-available.jpg'; // Default to placeholder

    try {
      if (image) {
        Alert.alert(
          'Uploading Image',
          'Please wait while we upload your photo...',
          [{text: 'OK'}],
          {
            cancelable: false,
          },
        );

        let uploadedUrl: string | null = null;
        try {
          uploadedUrl = await uploadImage(image);
        } catch (uploadError) {
          console.error('Image upload error (thrown):', uploadError);
          // uploadedUrl remains null if an error was thrown
        }

        if (!uploadedUrl) {
          // If upload failed (either returned null or threw an error)
          const continueWithoutImage = await new Promise<boolean>(resolve => {
            Alert.alert(
              'Warning',
              'Failed to upload image. Do you want to continue without the image?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {text: 'Continue', onPress: () => resolve(true)},
              ],
              {cancelable: false},
            );
          });

          if (!continueWithoutImage) {
            setLoading(false);
            return; // User chose to cancel submission
          }
          // If user chose to continue, finalImageUrl remains the placeholder
        } else {
          finalImageUrl = uploadedUrl; // Upload successful, use the actual URL
        }
      }

      const ipAddress = await NetworkInfo.getIPAddress();
      const submissionData = {
        ipAddress,
        reportedBy,
        contact,
        type: incidentType,
        snapshotUrl: finalImageUrl, // Use the determined finalImageUrl
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

  // Improved Welcome Modal Component
  const WelcomeModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showWelcomeModal}
      onRequestClose={() => setShowWelcomeModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={40}
                color="#4CAF50"
              />
            </View>
            <Text style={styles.modalTitle}>Welcome to SafetySense</Text>
            <Text style={styles.modalSubtitle}>
              Help keep your community safe
            </Text>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {/* Quick Terms Summary */}
            <View style={styles.termsCard}>
              <View style={styles.termsHeader}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#2196F3"
                />
                <Text style={styles.termsTitle}>Quick Terms</Text>
              </View>
              <View style={styles.termsList}>
                <View style={styles.termsItem}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.termsItemText}>
                    Reports are anonymous by default
                  </Text>
                </View>
                <View style={styles.termsItem}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.termsItemText}>
                    Your location helps emergency responders
                  </Text>
                </View>
                <View style={styles.termsItem}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.termsItemText}>
                    Only submit real emergencies
                  </Text>
                </View>
                <View style={styles.termsItem}>
                  <MaterialCommunityIcons
                    name="security"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.termsItemText}>
                    Your data is protected and secure
                  </Text>
                </View>
              </View>
            </View>

            {/* Important Notice */}
            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#FF9800"
                />
                <Text style={styles.noticeTitle}>Important</Text>
              </View>
              <Text style={styles.noticeText}>
                False reports may have legal consequences. Only report real
                emergencies.
              </Text>
            </View>

            {/* Agreement */}
            <View style={styles.agreementSection}>
              <Text style={styles.agreementText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowWelcomeModal(false)}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>I Understand</Text>
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
              Please review before submitting
            </Text>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={24}
                  color="#4CAF50"
                />
                <Text style={styles.confirmationTitle}>Location Sharing</Text>
              </View>
              <Text style={styles.confirmationText}>
                Your exact location will be shared with emergency responders:{' '}
                {location?.address}
              </Text>
            </View>

            <View style={styles.finalWarningCard}>
              <View style={styles.finalWarningHeader}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={24}
                  color="#FF5722"
                />
                <Text style={styles.finalWarningTitle}>Final Reminder</Text>
              </View>
              <Text style={styles.finalWarningText}>
                Only submit real emergencies. False reports may result in legal
                consequences.
              </Text>
            </View>
          </ScrollView>

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
      <WelcomeModal />
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

        {/* Personal Information Section */}
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
              style={[styles.photoButton, styles.fullWidthButton]}
              onPress={handleTakePhoto}>
              <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
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
              name="crosshairs-gps"
              size={20}
              color="#FFFFFF"
            />
            <Text> Your Exact Location</Text>
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              customMapStyle={darkMapStyle}>
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Your Exact Location">
                  <View style={styles.customMarker}>
                    <MaterialCommunityIcons
                      name="crosshairs-gps"
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
                  getCurrentLocation();
                } else {
                  requestLocationPermission();
                }
              }}>
              {isLocationLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="refresh"
                  size={24}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.locationTextContainer}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={16}
              color={locationError ? '#FF5722' : '#4CAF50'}
            />
            <Text
              style={[
                styles.locationText,
                locationError && styles.locationErrorText,
                !locationError && location && styles.locationSuccessText,
              ]}>
              {isLocationLoading
                ? 'Getting your exact location...'
                : locationError
                ? locationError
                : location
                ? location.address
                : 'Location required'}
            </Text>
          </View>
          {(locationError || !location) && (
            <TouchableOpacity
              style={styles.retryLocationButton}
              onPress={getCurrentLocation}>
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.retryLocationText}>
                {!isLocationPermissionGranted
                  ? 'Enable Location'
                  : 'Retry Location'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!location || isLocationLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitPress}
          disabled={loading || isLocationLoading || !location}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {!location ? 'Waiting for Location...' : 'Submit Report'}
              </Text>
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
    top: 16,
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
  locationErrorText: {
    color: '#FF8A65',
  },
  locationSuccessText: {
    color: '#81C784',
  },
  retryLocationButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  retryLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  submitButtonDisabled: {
    backgroundColor: '#455A64',
    opacity: 0.6,
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
    maxHeight: '80%',
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
    maxHeight: 300,
  },
  // New improved terms styles
  termsCard: {
    backgroundColor: '#0D2137',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E4976',
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  termsList: {
    gap: 12,
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termsItemText: {
    fontSize: 14,
    color: '#B8C7D9',
    lineHeight: 20,
    flex: 1,
  },
  noticeCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    marginBottom: 16,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#FFB74D',
    lineHeight: 20,
  },
  agreementSection: {
    marginBottom: 20,
  },
  agreementText: {
    fontSize: 14,
    color: '#B8C7D9',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#2196F3',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
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
  fullWidthButton: {
    flex: 1,
  },
});

export default ReportIncidentScreen;
