import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, StatusBar } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { AddTodoScreen } from '../screens/AddTodoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import * as Haptics from 'expo-haptics';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { View } from 'react-native';
import { TransitionPresets } from '@react-navigation/stack';
import { Dimensions } from 'react-native';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator({ navigation }) {
  const handleAddPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddTodoModal');
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FFF',
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: '#FFF',
            fontSize: 18,
            fontWeight: '600',
          },
          headerTitleAlign: 'center',
          headerBackground: () => null,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            position: 'absolute',
            elevation: 0,
            height: 70,
            paddingBottom: 25,
            bottom: 0,
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            position: 'absolute',
            zIndex: 1,
          },
          tabBarBackground: () => null,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="analytics" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <TouchableOpacity
        onPress={handleAddPress}
        style={{
          position: 'absolute',
          bottom: 30,
          alignSelf: 'center',
          backgroundColor: '#007AFF',
          width: 65,
          height: 65,
          borderRadius: 33,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0,
          shadowRadius: 3.84,
          elevation: 5,
          zIndex: 2,
        }}
      >
        <MaterialIcons name="add" size={35} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

export function AppNavigator() {
  const { height } = Dimensions.get('window');

  return (
    <View style={{ flex: 1 }}>
      <DarkModeShader />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerMode: 'none',
            cardStyle: { 
              backgroundColor: 'transparent'
            },
            cardOverlayEnabled: false,
            detachPreviousScreen: false,
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height * 0.5, 0],
                    }),
                  },
                ],
                backgroundColor: 'transparent'
              },
              overlayStyle: {
                opacity: 0,
                backgroundColor: 'transparent'
              },
              containerStyle: {
                backgroundColor: 'transparent'
              }
            }),
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddTodoModal"
            component={AddTodoScreen}
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          <Stack.Screen
            name="SettingsScreen"
            component={SettingsScreen}
            options={{
              presentation: 'card',
              headerShown: false,
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
} 