import React from 'react';
import { StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vTexCoord;
  uniform float uTime;

  // Convert hex colors to vec3
  // #290505 -> rgb(41, 5, 5) -> vec3(0.161, 0.020, 0.020)
  // #040927 -> rgb(4, 9, 39) -> vec3(0.016, 0.035, 0.153)

  float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vTexCoord;
    
    // New base colors from hex codes
    vec3 colorA = vec3(0.161, 0.020, 0.020); // #290505
    vec3 colorB = vec3(0.016, 0.035, 0.153); // #040927
    
    // Enhanced gradient with new colors
    float gradient = smoothstep(0.0, 1.0, uv.y);
    vec3 gradientColor = mix(colorA, colorB, gradient + sin(uTime * 0.2) * 0.1);
    
    // Add animated waves
    float waves = sin(uv.x * 6.0 + uTime) * sin(uv.y * 4.0 - uTime * 0.5) * 0.015;
    
    // Add subtle noise pattern
    float noisePattern = noise(uv * 2.0 + uTime * 0.1) * 0.02;
    
    // Animated glow points
    vec2 center1 = vec2(0.3 + sin(uTime * 0.5) * 0.1, 0.7 + cos(uTime * 0.3) * 0.1);
    vec2 center2 = vec2(0.7 + cos(uTime * 0.4) * 0.1, 0.3 + sin(uTime * 0.6) * 0.1);
    float glow1 = 0.02 / length(uv - center1) * 0.015;
    float glow2 = 0.02 / length(uv - center2) * 0.015;
    
    // Combine effects
    vec3 finalColor = gradientColor;
    finalColor += mix(colorA, colorB, 0.5) * waves;
    finalColor += mix(colorA, colorB, 0.3) * noisePattern;
    finalColor += vec3(0.3, 0.1, 0.1) * glow1; // Reddish glow
    finalColor += vec3(0.1, 0.1, 0.3) * glow2; // Bluish glow
    
    // Enhanced vignette
    float vignette = length(uv - 0.5) * 1.2;
    finalColor *= 1.0 - vignette * 0.7;
    
    // Subtle color correction
    finalColor = pow(finalColor, vec3(0.95));
    
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

export function DarkModeShader() {
  const onContextCreate = (gl: WebGLRenderingContext) => {
    // Create shaders
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, FRAGMENT_SHADER);
    gl.compileShader(fragShader);

    // Create program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Set up geometry
    const vertices = new Float32Array([
      -1.0, -1.4,  // Bottom left - extended much further down
       1.0, -1.4,  // Bottom right - extended much further down
      -1.0,  1.0,  // Top left
       1.0,  1.0,  // Top right
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'uTime');
    let startTime = Date.now();

    function render() {
      const time = (Date.now() - startTime) * 0.001;
      gl.uniform1f(timeLocation, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
      requestAnimationFrame(render);
    }

    render();
  };

  return (
    <GLView
      style={[
        StyleSheet.absoluteFill,
        { 
          bottom: -50,  // Increased negative bottom margin
          height: '110%'  // Extend the height beyond the screen
        }
      ]}
      onContextCreate={onContextCreate}
    />
  );
} 