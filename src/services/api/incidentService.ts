import {Platform} from 'react-native';
import api from './axios';

// Define types for the service
export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export interface IncidentSubmission {
  reportedBy?: string;
  contact?: string;
  type: string;
  snapshotUrl: string | null;
  description: string;
  longitude: string;
  latitude: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

const incidentService = {
  /**
   * Submit a citizen incident report
   * @param data The incident data to submit
   * @returns The response from the API
   */
  submitCitizenReport: async (data: IncidentSubmission) => {
    try {
      const response = await api.post('/incidents/citizen-report', data);
      return response.data;
    } catch (error) {
      console.error('Error submitting incident report:', error);
      throw error;
    }
  },

  /**
   * Upload an image for an incident
   * @param imageUri The URI of the image to upload
   * @param onProgress Optional callback for upload progress
   * @returns The URL of the uploaded image
   */
  /**
   * Upload an image for an incident
   * @param imageUri The URI of the image to upload
   * @param onProgress Optional callback for upload progress
   * @returns The URL of the uploaded image
   */
  uploadImage: async (
    imageUri: string,
    onProgress?: UploadProgressCallback,
  ): Promise<string> => {
    if (!imageUri) {
      throw new Error('No image URI provided');
    }

    // Create form data
    const formData = new FormData();

    // Get file name from URI
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];

    // Determine file type (default to jpeg if unknown)
    let fileType = 'image/jpeg';
    if (fileName.toLowerCase().endsWith('.png')) {
      fileType = 'image/png';
    }
    if (fileName.toLowerCase().endsWith('.gif')) {
      fileType = 'image/gif';
    }

    // Append image to form data
    formData.append('image', {
      uri:
        Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
      type: fileType,
      name: fileName,
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set up progress tracking if callback provided
      if (onProgress) {
        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100,
            );
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log(response);

            if (response.success && response.data && response.data.imagePath) {
              console.log('TEST IMAGE UPLOAD: ', response.data.imagePath);
              resolve(response.data.imagePath); // ✅ only keep path like 'uploads/incidents/filename.jpg'
            } else {
              reject(new Error('Invalid response format from server'));
            }
          } catch (e) {
            reject(new Error('Invalid JSON response from server'));
          }
        } else {
          reject(new Error(`Server responded with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed'));
      };

      xhr.open('POST', `${api.defaults.baseURL}/incidents/upload-image`);
      xhr.send(formData);
    });
  },

  /**
   * Get all incidents with optional filtering
   * @param filters Optional filters for the incidents
   * @returns The list of incidents
   */
  getIncidents: async (filters = {}) => {
    try {
      const response = await api.get('/incidents', {params: filters});
      return response.data;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }
  },

  /**
   * Get a specific incident by ID
   * @param id The ID of the incident to fetch
   * @returns The incident data
   */
  getIncidentById: async (id: string) => {
    try {
      const response = await api.get(`/incidents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching incident with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Accept an incident (for responders)
   * @param incidentId The ID of the incident to accept
   * @param userId The ID of the user accepting the incident
   * @returns The response from the API
   */
  acceptIncident: async (incidentId: string, userId: string) => {
    try {
      const response = await api.post(`/incidents/${incidentId}/accept`, {
        userId,
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting incident:', error);
      throw error;
    }
  },

  /**
   * Resolve an incident
   * @param incidentId The ID of the incident to resolve
   * @param resolutionNotes Optional notes about the resolution
   * @returns The response from the API
   */
  resolveIncident: async (incidentId: string, resolutionNotes?: string) => {
    try {
      const response = await api.put(`/incidents/${incidentId}/resolve`, {
        resolutionNotes,
      });
      return response.data;
    } catch (error) {
      console.error('Error resolving incident:', error);
      throw error;
    }
  },

  /**
   * Get incident statistics
   * @returns The incident statistics
   */
  getIncidentStats: async () => {
    try {
      const response = await api.get('/incidents/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching incident statistics:', error);
      throw error;
    }
  },
};

export default incidentService;
