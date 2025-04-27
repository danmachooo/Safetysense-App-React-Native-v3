import {type NavigationContainerRef} from '@react-navigation/native';

// Define a type for the navigation ref that's more flexible
type NavigationRef = NavigationContainerRef<any>;

let navigator: NavigationRef | null = null;
let isReady = false;

let onReadyCallback: () => void;
const readyPromise = new Promise<void>(resolve => {
  onReadyCallback = resolve;
});

export const NavigationService = {
  setTopLevelNavigator(navigatorRef: NavigationRef | null) {
    navigator = navigatorRef;
    if (navigatorRef) {
      isReady = true;
      onReadyCallback();
    }
  },

  async navigate(routeName: string, params?: any) {
    if (!isReady) {
      await readyPromise;
    }

    if (navigator) {
      navigator.navigate(routeName, params);
    }
  },

  // Add a method to navigate to nested screens
  // Modified navigateToIncidentDetails function
  async navigateToIncidentDetails(incident: any) {
    if (!isReady) {
      await readyPromise;
    }
    if (navigator) {
      navigator.navigate('Dashboard', {
        screen: 'IncidentDetails',
        params: {incident, source: 'dashboard'},
      });
    }
  },
  getNavigator() {
    return navigator;
  },
};
