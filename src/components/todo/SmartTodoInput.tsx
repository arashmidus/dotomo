import React, { forwardRef } from 'react';
import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Pressable, 
  Animated, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  Keyboard 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ParsedTodo } from '../../types/nlp';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const PLACEHOLDER_TEXTS = [
  "What's on your mind?",
  "Add a new task...",
  "Write your next goal...",
  "What needs to be done?",
];

interface SmartTodoInputProps {
  onSubmit: (todo: ParsedTodo) => void;
}

export const SmartTodoInput = forwardRef((props: SmartTodoInputProps, ref) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_TEXTS[0]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(prev => {
        const currentIndex = PLACEHOLDER_TEXTS.indexOf(prev);
        return PLACEHOLDER_TEXTS[(currentIndex + 1) % PLACEHOLDER_TEXTS.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start();
  }, []);

  function handleSubmit() {
    if (!input.trim()) return;

    const parsedTodo: ParsedTodo = {
      title: input,
      description: '',
      tags: [],
      priority: 'medium',
    };

    props.onSubmit(parsedTodo);
    setInput('');
    Keyboard.dismiss();
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        { 
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ] 
        }
      ]}
    >
      <TextInput
        ref={ref}
        style={[styles.input, isFocused && styles.inputFocused]}
        value={input}
        onChangeText={setInput}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={false}
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => Keyboard.dismiss()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <Pressable
        style={[styles.button, !input.trim() && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!input.trim()}
      >
        <MaterialIcons
          name="add-circle"
          size={24}
          color={input.trim() ? '#007AFF' : '#999'}
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    margin: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerFocused: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginRight: 12,
  },
  inputFocused: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF20',
  },
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  buttonFocused: {
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
}); 