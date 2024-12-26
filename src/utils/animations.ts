import { Animated } from 'react-native';

export const startWaveAnimation = (animatedValue: Animated.Value) => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ])
  ).start();
};

export const stopWaveAnimation = (animatedValue: Animated.Value) => {
  animatedValue.stopAnimation();
  animatedValue.setValue(0);
}; 