import React from 'react';
import { StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { SharedValue, runOnUI } from 'react-native-reanimated';

interface LiquidShaderProps {
  progress: SharedValue<number>;
  sourcePosition: {
    x: number;
    y: number;
  };
}

function render(gl: WebGL2RenderingContext, progress: number, sourcePosition: { x: number; y: number }) {
  'worklet';
  
  // Create vertex shader
  const vert = gl.createShader(gl.VERTEX_SHADER);
  if (!vert) return;
  
  gl.shaderSource(vert, `
    attribute vec4 position;
    varying vec2 uv;
    void main() {
      uv = position.xy * 0.5 + 0.5;
      gl_Position = position;
    }
  `);
  gl.compileShader(vert);

  // Create fragment shader
  const frag = gl.createShader(gl.FRAGMENT_SHADER);
  if (!frag) return;
  
  gl.shaderSource(frag, `
    precision highp float;
    varying vec2 uv;
    uniform float progress;
    uniform vec2 source;
    
    void main() {
      vec2 p = uv - source;
      float d = length(p);
      
      float r = mix(0.0, 0.3, progress);
      float blob = smoothstep(r + 0.01, r, d);
      
      vec2 dir = normalize(vec2(0.5, 0.5) - source);
      float angle = atan(p.y, p.x) - atan(dir.y, dir.x);
      float tentacles = smoothstep(0.1, 0.0, abs(sin(angle * 8.0))) * 
                       smoothstep(r + 0.3, r - 0.1, d) * progress;
      
      float alpha = max(blob, tentacles) * progress;
      gl_FragColor = vec4(0.1, 0.1, 0.1, alpha);
    }
  `);
  gl.compileShader(frag);

  // Create program
  const program = gl.createProgram();
  if (!program) return;
  
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Set up geometry
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const progressLoc = gl.getUniformLocation(program, 'progress');
  const sourceLoc = gl.getUniformLocation(program, 'source');

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  gl.uniform1f(progressLoc, progress);
  gl.uniform2f(sourceLoc, 
    sourcePosition.x / gl.drawingBufferWidth,
    1 - (sourcePosition.y / gl.drawingBufferHeight)
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.endFrameEXP();
}

export function LiquidShaderComponent({ progress, sourcePosition }: LiquidShaderProps) {
  const onContextCreate = (gl: WebGL2RenderingContext) => {
    runOnUI((contextId: number) => {
      'worklet';
      const glContext = GLView.getWorkletContext(contextId);
      render(glContext, progress.value, sourcePosition);
    })(gl.contextId);
  };

  return (
    <GLView
      style={StyleSheet.absoluteFill}
      onContextCreate={onContextCreate}
      enableExperimentalWorkletSupport
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
}); 