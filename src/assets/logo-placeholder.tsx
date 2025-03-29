// This is just to show what the logo might look like
// You should replace this with an actual image file

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LogoPlaceholder = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    backgroundColor: '#0A6375',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
});

export default LogoPlaceholder;