import { LogBox } from 'react-native';
import Reanimated from 'react-native-reanimated';

// Disable the strict mode warning
if (Reanimated.setGestureStateIfRunningInRemoteDebugger) {
  Reanimated.setGestureStateIfRunningInRemoteDebugger(true);
}

// Or alternatively, you can just ignore the warning
LogBox.ignoreLogs([
  "[Reanimated] Reading from `value` during component render"
]); 