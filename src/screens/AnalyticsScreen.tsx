import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTodos } from '../contexts/TodoContext'; // Assuming you have this context
import { DarkModeShader } from '../components/shaders/DarkModeShader';

export function AnalyticsScreen() {
  const { todos } = useTodos();

  // Calculate total and completed tasks
  const totalTasks = todos.length;
  const completedTasks = todos.filter(todo => todo.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Mock data for the line chart (you can replace this with actual historical data)
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [
          completedTasks,
          Math.max(completedTasks - 1, 0),
          Math.max(completedTasks - 2, 0),
          Math.max(completedTasks - 3, 0),
          Math.max(completedTasks - 4, 0),
          Math.max(completedTasks - 5, 0),
          Math.max(completedTasks - 6, 0),
        ].reverse(),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={styles.container}>
      <DarkModeShader />
      <Text style={styles.screenTitle}>Analytics Overview</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Tasks</Text>
          <Text style={styles.statNumber}>{totalTasks}</Text>
        </View>
        <View style={[styles.statBox, styles.middleStatBox]}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statNumber}>{completedTasks}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={styles.statNumber}>{completionRate}%</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Progress</Text>
        <LineChart
          data={data}
          width={Dimensions.get('window').width - 88}
          height={220}
          chartConfig={{
            ...chartConfig,
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: '#2E90FA'
            }
          }}
          bezier
          style={{
            borderRadius: 16,
            marginLeft: -4,
          }}
        />
      </View>
    </View>
  );
}

const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: 'transparent',
  backgroundGradientTo: 'transparent',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(46, 144, 250, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
  strokeWidth: 2,
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: "rgba(255, 255, 255, 0.05)",
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#0A0A0A',
    paddingTop: 48,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 32,
    marginTop: 84,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  middleStatBox: {
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
}); 