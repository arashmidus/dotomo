import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CARD_WIDTH = SCREEN_WIDTH * 0.9;
export const CARD_HEIGHT = CARD_WIDTH * 1.4;
export const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
export const MAX_VISIBLE_CARDS = 3;

export const SPRING_CONFIG = {
  damping: 20,
  mass: 0.005,
  stiffness: 10,
  overshootClamping: false,
  restSpeedThreshold: 0.01,
  restDisplacementThreshold: 0.01,
};

export const CARD_SHADER = `
  precision highp float;
  // ... your shader code ...
`; 