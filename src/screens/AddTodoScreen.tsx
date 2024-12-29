import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView, InteractionManager, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartTodoInput } from '../components/todo/SmartTodoInput';
import { useTodos } from '../contexts/TodoContext';
import { useSettings } from '../contexts/SettingsContext';
import { NotificationService } from '../services/NotificationService';
import { ParsedTodo } from '../types/nlp';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { GLView } from 'expo-gl';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

const FRAGMENT_SHADER = `
  precision highp float;
  
  varying vec2 vTexCoord;
  uniform float uTime;
  uniform float uSwipe;
  
  // Modern, dreamy color palette
  const vec3 skyBlue = vec3(0.85, 0.91, 1.0);      // #D9E8FF - soft sky blue
  const vec3 lavender = vec3(0.93, 0.91, 0.99);    // #EDE8FD - gentle lavender
  const vec3 mintGreen = vec3(0.90, 0.99, 0.97);   // #E5FDF8 - fresh mint
  const vec3 peach = vec3(1.0, 0.95, 0.93);        // #FFF2EE - soft peach

  void main() {
    vec2 uv = vTexCoord;
    float t = uTime * 0.015; // Super slow, dreamy movement
    
    // Create organic flowing movement
    vec2 flow = vec2(
      sin(t + uv.x * 2.0) * cos(t * 0.4) * 0.3,
      cos(t * 0.8 + uv.y * 2.0) * sin(t * 0.3) * 0.3
    );
    
    vec2 distortedUV = uv + flow;
    
    // Create smooth, flowing color transitions
    float noise1 = sin(distortedUV.x * 3.0 + distortedUV.y * 2.0 + t) * 0.5 + 0.5;
    float noise2 = cos(distortedUV.y * 2.0 - distortedUV.x * 3.0 - t * 1.2) * 0.5 + 0.5;
    
    // Blend the colors in a more interesting way
    vec3 gradient = skyBlue;
    gradient = mix(gradient, lavender, 
      smoothstep(0.3, 0.7, noise1) * 0.4
    );
    gradient = mix(gradient, mintGreen, 
      smoothstep(0.4, 0.6, noise2) * 0.3
    );
    gradient = mix(gradient, peach,
      smoothstep(0.45, 0.55, (noise1 + noise2) * 0.5) * 0.2
    );
    
    // Add a subtle sparkle effect
    float sparkle = sin(uv.x * 40.0 + t) * sin(uv.y * 40.0 - t);
    sparkle = pow(max(0.0, sparkle), 20.0) * 0.03;
    
    // Add very subtle swipe response
    float swipeEffect = sin(distortedUV.x * 3.14 + t) * uSwipe * 0.02;
    
    // Combine everything with a dreamy softness
    gradient += vec3(sparkle + swipeEffect);
    gradient = mix(gradient, vec3(1.0), 0.1); // Add slight brightness
    gradient = smoothstep(0.0, 1.0, gradient); // Extra smoothing
    
    gl_FragColor = vec4(gradient, 1.0);
  }
`;

const VERTEX_SHADER = `
  attribute vec4 position;
  varying vec2 vTexCoord;
  
  void main() {
    vTexCoord = position.xy * 0.5 + 0.5;
    gl_Position = position;
  }
`;

function CardShader({ time, swipeProgress }) {
  const onContextCreate = (gl) => {
    // Create and compile shaders
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, FRAGMENT_SHADER);
    gl.compileShader(fragShader);

    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Set up buffers
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Set up attributes and uniforms
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const swipeLocation = gl.getUniformLocation(program, "uSwipe");

    // Render function
    const render = () => {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      
      // Clear with white to match the modal background
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Update uniforms
      gl.uniform1f(timeLocation, time);
      gl.uniform1f(swipeLocation, swipeProgress);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
    };

    render();
  };

  return (
    <GLView
      style={StyleSheet.absoluteFill}
      onContextCreate={onContextCreate}
    />
  );
}

export function AddTodoScreen() {
  const navigation = useNavigation();
  const { addTodo } = useTodos();
  const { settings } = useSettings();
  const slideAnim = useSharedValue(1);
  const inputRef = React.useRef(null);
  const keyboardHeight = useSharedValue(0);
  const shaderTime = useSharedValue(0);
  const swipeProgress = useSharedValue(0);

  React.useEffect(() => {
    // Show modal first
    slideAnim.value = withSpring(0, {
      damping: 15,
      stiffness: 90
    });

    // Pre-emptively show keyboard
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, {
          duration: Platform.OS === 'ios' ? e.duration : 250
        });
      }
    );

    // Focus input after a very short delay
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      keyboardShowListener.remove();
    };
  }, []);

  // Add effect to animate shader time
  React.useEffect(() => {
    shaderTime.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 10000 }),
      -1,
      false
    );
  }, []);

  async function handleSubmit(parsedTodo: ParsedTodo) {
    const todo = {
      title: parsedTodo.title,
      description: parsedTodo.description,
      dueDate: parsedTodo.dueDate || new Date(),
      completed: false,
      tags: parsedTodo.tags,
    };

    await addTodo(todo);
    
    if (settings.notifications.enabled) {
      await NotificationService.scheduleSmartNotification(todo, settings.notifications);
    }

    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <View style={styles.dismissArea} />
      </TouchableWithoutFeedback>

      <Animated.View 
        style={[
          styles.modalContent,
          useAnimatedStyle(() => ({
            transform: [{
              translateY: withSpring(slideAnim.value * 600)
            }]
          }))
        ]}
      >
        <View style={[
          StyleSheet.absoluteFill, 
          styles.shaderContainer
        ]}>
          <View style={styles.shaderWrapper}>
            <CardShader
              time={shaderTime.value}
              swipeProgress={swipeProgress.value}
            />
          </View>
        </View>

        <ScrollView 
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.header}>
            <MaterialIcons name="playlist-add" size={48} color="#007AFF" />
            <Text style={styles.title}>Create New Task</Text>
            <Text style={styles.subtitle}>What would you like to accomplish?</Text>
          </View>

          <Animated.View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="edit" size={24} color="#007AFF" />
              <Text style={styles.cardTitle}>New Task</Text>
            </View>
            <View style={styles.inputContainer}>
              <SmartTodoInput 
                ref={inputRef}
                onSubmit={handleSubmit}
                autoFocus={true}
              />
            </View>
          </Animated.View>

          {/* <View style={styles.decorationContainer}>
            <MaterialIcons name="stars" size={24} color="#007AFF" style={styles.decoration} />
            <MaterialIcons name="local-fire-department" size={24} color="#FF9500" style={styles.decoration} />
            <MaterialIcons name="emoji-events" size={24} color="#34C759" style={styles.decoration} />
          </View> */}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    margin: 0,
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '85%',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shaderContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  shaderWrapper: {
    position: 'absolute',
    top: -20, // Extend shader above the visible area
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    color: '#007AFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  decorationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  decoration: {
    margin: 8,
    transform: [{ rotate: '-15deg' }],
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
}); 