import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTodos } from '../../contexts/TodoContext';
import { format, differenceInHours, differenceInMinutes, isAfter, addHours } from 'date-fns';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { generateReminder, generateTaskBreakdown } from '../../services/LLMService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { GLView } from 'expo-gl';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_ANGLE = 2;

// Add spring configuration at the top level
const SPRING_CONFIG = {
  damping: 20,

  mass: 0.005,
  stiffness: 10,
  overshootClamping: false,
  restSpeedThreshold: 0.01,
  restDisplacementThreshold: 0.01,
};

// Add these constants at the top
const φ = (1 + Math.sqrt(5)) / 2; // Golden ratio
const α = Math.PI / 15; // 15 degrees in radians
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_WIDTH * 1.2; // Fixed aspect ratio instead of golden ratio
const A = SCREEN_WIDTH * Math.cos(α) + SCREEN_WIDTH * Math.sin(α);
const CARD_OFFSET = 3; // Vertical offset between cards

// GLSL shader as a string constant
const FRAGMENT_SHADER = `
  precision highp float;
  
  varying vec2 vTexCoord;
  uniform float uTime;
  uniform float uSwipe;
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    vec2 uv = vTexCoord;
    
    // Base gradient
    vec3 color1 = vec3(0.98, 0.98, 1.0);
    vec3 color2 = vec3(0.95, 0.97, 1.0);
    
    // Animated noise
    float noise = snoise(uv * 3.0 + uTime * 0.2);
    
    // Dynamic gradient with noise
    float gradient = smoothstep(0.0, 1.0, uv.y + noise * 0.2);
    
    // Swipe effect
    float swipeEffect = sin(uv.x * 6.28 + uTime) * uSwipe;
    
    // Final color
    vec3 finalColor = mix(color1, color2, gradient + swipeEffect);
    
    // Add subtle shimmer
    finalColor += vec3(0.02) * sin(uTime * 2.0 + uv.y * 10.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
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

    // Update uniforms
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const swipeLocation = gl.getUniformLocation(program, "uSwipe");

    // Render loop
    function render() {
      gl.uniform1f(timeLocation, time);
      gl.uniform1f(swipeLocation, swipeProgress);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
    }

    render();
  };

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreate={onContextCreate}
    />
  );
}

function formatSafeDate(date: Date | string | undefined): string {
  if (!date) return 'No date';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return format(dateObj, 'PPP');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

// Add this helper function
function getDueDate(createdAt: string | Date): string {
  const startDate = new Date(createdAt);
  const dueDate = addHours(startDate, 24);
  return formatSafeDate(dueDate);
}

// Modify this helper function to get the reminder time
function getScheduledReminderTime(todo) {
  // Check for llmAnalysis first
  if (!todo.llmAnalysis?.recommendedTime) {
    return 'Scheduling...';
  }
  
  try {
    return todo.llmAnalysis.recommendedTime; // Simply return the recommendedTime string
  } catch (error) {
    console.error('Error formatting reminder time:', error);
    return 'Invalid time';
  }
}

export function TodoList() {
  const { todos, deleteTodo, updateTodo } = useTodos();
  const [localTodos, setLocalTodos] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const animatedIndex = useSharedValue(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Modified loadTodosFromDB function
  React.useEffect(() => {
    async function loadTodosFromDB() {
      try {
        const storedTodos = await AsyncStorage.getItem('todos');
        console.log('Loading from AsyncStorage:', storedTodos); // Debug log
        
        if (storedTodos) {
          const parsedTodos = JSON.parse(storedTodos);
          const sortedTodos = parsedTodos
            .sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            })
            .map((todo, index) => ({
              ...todo,
              orderNumber: parsedTodos.length - index
            }));
          setLocalTodos(sortedTodos);
          console.log('Sorted todos after loading:', sortedTodos); // Debug log
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading todos from database:', error);
        setIsLoading(false);
      }
    }
    loadTodosFromDB();
  }, []);

  // Modified syncWithDB function with additional error handling
  React.useEffect(() => {
    async function syncWithDB() {
      try {
        if (!todos || todos.length === 0) {
          console.log('No todos to sync'); // Debug log
          return;
        }

        const sortedTodos = [...todos]
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          })
          .map((todo, index) => ({
            ...todo,
            orderNumber: todos.length - index
          }));

        await AsyncStorage.setItem('todos', JSON.stringify(sortedTodos));
        console.log('Saved to AsyncStorage:', sortedTodos); // Debug log
        
        // Verify the save was successful
        const savedTodos = await AsyncStorage.getItem('todos');
        console.log('Verification read:', savedTodos); // Debug log

        setLocalTodos(sortedTodos);
      } catch (error) {
        console.error('Error syncing with database:', error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
      }
    }
    syncWithDB();
  }, [todos]);

  const handleSwipe = (direction: 'left' | 'right') => {
    const totalCards = localTodos.length;
    if (totalCards <= 1 || isAnimating) return;

    setIsAnimating(true);

    // Left swipe shows the next card (increment index)
    // Right swipe shows the previous card (decrement index)
    const newIndex = direction === 'right' 
      ? (currentIndex + 1) % totalCards  // Show next card
      : (currentIndex - 1 + totalCards) % totalCards;  // Show previous card

    console.log('Current Index:', currentIndex, 'New Index:', newIndex);

    // Reset animation values first
    animatedIndex.value = withSpring(0, SPRING_CONFIG, () => {
      runOnJS(setCurrentIndex)(newIndex);
      runOnJS(setIsAnimating)(false);
    });
  };

  const handleDelete = async (todoId: string) => {
    try {
      // Delete from context/main storage
      await deleteTodo(todoId);
      
      // Update local state
      setLocalTodos(prev => prev.filter(todo => todo.id !== todoId));
      
      // Update AsyncStorage
      const updatedTodos = localTodos.filter(todo => todo.id !== todoId);
      await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleComplete = async (todoId: string) => {
    try {
      // Update the todo in context/main storage
      await updateTodo(todoId, { completed: true, completedAt: new Date().toISOString() });
      
      // Update local state
      setLocalTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: true, completedAt: new Date().toISOString() }
          : todo
      ));
      
      // Update AsyncStorage
      const updatedTodos = localTodos.map(todo =>
        todo.id === todoId 
          ? { ...todo, completed: true, completedAt: new Date().toISOString() }
          : todo
      );
      await AsyncStorage.setItem('todos', JSON.stringify(updatedTodos));
    } catch (error) {
      console.error('Error completing todo:', error);
    }
  };

  // Memoize visible cards calculation
  const visibleCards = React.useMemo(() => {
    if (!localTodos.length) return [];
    
    const totalCards = localTodos.length;
    const visibleTodos = [];
    for (let i = 0; i < totalCards; i++) {
      // Calculate indices in reverse order so newer cards appear on top
      const index = (currentIndex - i + totalCards) % totalCards;
      visibleTodos.push({
        ...localTodos[index],
        position: i,
        scale: interpolate(
          i,
          [0, totalCards - 1],
          [1, 0.9]
        ),
        translateY: i * CARD_OFFSET,
      });
    }
    return visibleTodos;
  }, [localTodos, currentIndex]);

  return (
    <View style={styles.container}>
      {localTodos.length > 0 ? (
        visibleCards.map((item, index) => (
          <TodoCard
            key={item.id}
            item={item}
            onSwipe={handleSwipe}
            onDelete={() => handleDelete(item.id)}
            onComplete={() => handleComplete(item.id)}
            zIndex={localTodos.length - index}
            position={index}
            scale={item.scale}
            translateY={item.translateY}
            isVisible={true}
            animatedIndex={animatedIndex}
            totalCards={localTodos.length}
          />
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="playlist-plus" 
            size={80} 
            color="#CCCCCC" 
          />
          <Text style={styles.emptyText}>No Tasks Yet</Text>
          <Text style={styles.emptySubtext}>Add a task to get started</Text>
        </View>
      )}
    </View>
  );
}

function TodoCard({ 
  item, 
  onSwipe,
  onDelete,
  onComplete,
  zIndex, 
  position,
  scale,
  translateY,
  animatedIndex,
  totalCards 
}) {
  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(scale);
  const cardTranslateY = useSharedValue(translateY);
  const isReentering = useSharedValue(false);
  const [timeRemaining, setTimeRemaining] = React.useState('');
  const hasProvidedHapticFeedback = useSharedValue(false);
  const shaderTime = useSharedValue(0);
  const swipeProgress = useSharedValue(0);

  // Modified timer effect
  React.useEffect(() => {
    const startTime = item.createdAt ? new Date(item.createdAt) : new Date();
    const expiryTime = addHours(startTime, 24);

    const updateTimer = () => {
      const now = new Date();
      const diffInSeconds = Math.max(0, (expiryTime.getTime() - now.getTime()) / 1000);
      
      // If timer has expired, delete the todo
      if (diffInSeconds <= 0) {
        runOnJS(onDelete)();
        return;
      }

      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = Math.floor(diffInSeconds % 60);

      const formattedTime = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');
      
      setTimeRemaining(formattedTime);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [item, onDelete]);

  const resetPosition = () => {
    isReentering.value = true;
    // First, instantly move the card off-screen to the right
    translateX.value = SCREEN_WIDTH * 1.5;
    
    // This setTimeout determines when the card starts moving back to its original position
    // Currently set to 50ms delay before the reset animation begins
    setTimeout(() => {
      translateX.value = withSpring(0, SPRING_CONFIG, () => {
        isReentering.value = false;
      });
    }, 50);
  };

  const panGesture = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      // Reset haptic feedback flag on start
      hasProvidedHapticFeedback.value = false;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;

      // Provide haptic feedback when crossing threshold
      if (!hasProvidedHapticFeedback.value && Math.abs(event.translationX) > SWIPE_THRESHOLD / 2) {
        hasProvidedHapticFeedback.value = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (hasProvidedHapticFeedback.value && Math.abs(event.translationX) < SWIPE_THRESHOLD / 2) {
        // Reset flag when moving back
        hasProvidedHapticFeedback.value = false;
      }
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        const targetX = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
        
        // Animate the card off screen
        translateX.value = withSpring(
          targetX,
          SPRING_CONFIG,
          () => {
            // After card is off screen, trigger the swipe handler
            runOnJS(onSwipe)(direction);
            // Then reset the position
            runOnJS(resetPosition)();
          }
        );
      } else {
        // Reset position if not swiped far enough
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    },
  });

  // Animate shader time
  React.useEffect(() => {
    shaderTime.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 10000 }),
      -1,
      false
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [α, 0, -α],
      Extrapolate.CLAMP
    );

    // Calculate opacity based on position and animation state
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [position < totalCards ? 1 : 0, 1],
      Extrapolate.CLAMP
    );

    // Update swipe progress for shader
    swipeProgress.value = Math.abs(translateX.value) / SWIPE_THRESHOLD;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: cardTranslateY.value },
        { scale: cardScale.value },
        { rotateZ: `${rotateZ}rad` }
      ],
      opacity: isReentering.value ? withSpring(1) : opacity,
    };
  }, [position]);

  // Update card position when stack changes
  React.useEffect(() => {
    cardScale.value = withSpring(scale, SPRING_CONFIG);
    cardTranslateY.value = withSpring(translateY, SPRING_CONFIG);
  }, [scale, translateY]);

  const handleCompleteSwipe = () => {
    onComplete();
    onSwipe('right');
  };

  return (
    <PanGestureHandler onGestureEvent={panGesture}>
      <Animated.View style={[styles.card, cardStyle, { zIndex }]}>
        <View style={StyleSheet.absoluteFill}>
          <CardShader
            time={shaderTime.value}
            swipeProgress={swipeProgress.value}
          />
        </View>
        
        <View style={[styles.todoContent, { backgroundColor: 'transparent' }]}>
          <View style={styles.titleContainer}>
            <Text style={[
              styles.todoTitle,
              item.completed && styles.completedTitle
            ]}>
              {item.title}
            </Text>
            <Text style={styles.itemCounter}>
              {`${item.orderNumber}/${totalCards}`}
            </Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <Text style={[
              styles.todoDate,
              item.completed && styles.completedText
            ]}>
              {item.completed 
                ? `Completed on: ${formatSafeDate(item.completedAt)}` 
                : `Reminder scheduled for: ${getScheduledReminderTime(item)}`
              }
            </Text>
            {!item.completed && (
              <Text style={styles.timerText}>
                {timeRemaining || '18:00:00'}
              </Text>
            )}
          </View>

          {item.completed ? (
            <View style={styles.completedContainer}>
              <MaterialIcons name="check-circle" size={120} color="#4CAF50" />
              <Text style={styles.completedMessage}>Task Complete!</Text>
            </View>
          ) : (
            <>
              {item.description && (
                <Text style={styles.todoDescription}>
                  {item.description}
                </Text>
              )}

              {item.taskList && item.taskList.length > 0 && (
                <View style={styles.taskListContainer}>
                  {item.taskList.map((task, index) => (
                    <View key={index} style={styles.taskItem}>
                      <MaterialIcons name="chevron-right" size={16} color="#666" />
                      <Text style={styles.taskText}>{task}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {item.tags.length > 0 && (
            <View style={styles.tagContainer}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]}
            onPress={() => onDelete()}
          >
            <MaterialIcons name="delete" size={24} color="white" />
            {/* <Text style={styles.buttonText}>Delete</Text> */}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.completeButton]}
            onPress={handleCompleteSwipe}
          >
            <MaterialIcons name="check" size={24} color="white" />
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    perspective: 1000,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backfaceVisibility: 'hidden',
    transform: [{ perspective: 1000 }],
    overflow: 'hidden',
  },
  todoContent: {
    flex: 1,
    marginBottom: 60, // Add space for buttons
    backgroundColor: 'transparent',
  },
  todoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  todoDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  todoDate: {
    fontSize: 14,
    color: '#666',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
  },
  todoSummary: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#444',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  taskListContainer: {
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  taskText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 8,
    flex: 1,
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#FF5722',
    fontWeight: '500',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteButton: {
    backgroundColor: '#FF5722',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  completedMessage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 16,
    textAlign: 'center',
  },
  completedCard: {
    backgroundColor: '#F5F5F5',
    opacity: 0.9,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  completedText: {
    color: '#888',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemCounter: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 12,
  },
}); 