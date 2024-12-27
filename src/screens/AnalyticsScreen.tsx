import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkModeShader } from '../components/shaders/DarkModeShader';
import { useFocusEffect } from '@react-navigation/native';
import { useTodos } from '../contexts/TodoContext';

export function AnalyticsScreen() {
  const { todos } = useTodos();
  const [analyticsData, setAnalyticsData] = React.useState({
    totalTasks: 0,
    completedTasks: 0,
    weeklyProgress: {
      total: [0, 0, 0, 0, 0, 0, 0],
      completed: [0, 0, 0, 0, 0, 0, 0]
    }
  });
  const [selectedIndex, setSelectedIndex] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      function calculateAnalytics() {
        const totalTasks = todos.length;
        const completedTasks = todos.filter(todo => todo.completed).length;

        // Get today's date and tasks
        const now = new Date();
        const todayIndex = (now.getDay() + 6) % 7; // Convert to Monday = 0, Sunday = 6

        // Initialize arrays with zeros
        const weeklyTotal = Array(7).fill(0);
        const weeklyCompleted = Array(7).fill(0);

        // Add tasks to their respective days
        todos.forEach(todo => {
          const todoDate = new Date(todo.createdAt || now);
          const todoDay = (todoDate.getDay() + 6) % 7;
          
          // Only count tasks from the current week
          const dayDiff = Math.floor((now - todoDate) / (1000 * 60 * 60 * 24));
          if (dayDiff < 7) {
            weeklyTotal[todoDay]++;
            
            if (todo.completed && todo.completedAt) {
              const completedDate = new Date(todo.completedAt);
              const completedDay = (completedDate.getDay() + 6) % 7;
              weeklyCompleted[completedDay]++;
            }
          }
        });

        console.log('Today is day index:', todayIndex);
        console.log('Weekly data:', weeklyTotal);

        setAnalyticsData({
          totalTasks,
          completedTasks,
          weeklyProgress: {
            total: weeklyTotal,
            completed: weeklyCompleted
          }
        });
      }

      calculateAnalytics();
    }, [todos])
  );

  const completionRate = analyticsData.totalTasks > 0 
    ? Math.round((analyticsData.completedTasks / analyticsData.totalTasks) * 100) 
    : 0;

  // Update the chart configuration
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: analyticsData.weeklyProgress.total,
        color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`, // Orange for total tasks
        strokeWidth: 2
      },
      {
        data: analyticsData.weeklyProgress.completed,
        color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`, // Green for completed tasks
        strokeWidth: 2
      }
    ],
    legend: ['Total Tasks', 'Completed']
  };

  return (
    <View style={styles.container}>
      <DarkModeShader />
      <Text style={styles.screenTitle}>Analytics Overview</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Tasks</Text>
          <Text style={styles.statNumber}>{analyticsData.totalTasks}</Text>
        </View>
        <View style={[styles.statBox, styles.middleStatBox]}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statNumber}>{analyticsData.completedTasks}</Text>
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
          width={Dimensions.get('window').width - 64}
          height={220}
          style={{ marginLeft: 0, backgroundColor: 'transparent' }}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: "rgba(255, 255, 255, 0.05)",
            },
            yAxisMin: 0,
            yAxisMax: Math.max(...analyticsData.weeklyProgress.total),
            paddingRight: 0,
            paddingLeft: -40,
            fillShadowGradientFrom: 'transparent',
            fillShadowGradientTo: 'transparent',
          }}
          withVerticalLabels={true}
          withHorizontalLabels={false}
          withVerticalLines={false}
          withHorizontalLines={false}
          fromZero={true}
          transparent={true}
        />
      </View>
    </View>
  );
}

const Tooltip = ({x, y, value, visible}) => {
  if (!visible) return null;
  
  return (
    <View
      style={{
        position: 'absolute',
        left: x - 20,
        top: y - 28,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 6,
        padding: 4,
        minWidth: 30,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#000', fontSize: 12 }}>{value}</Text>
    </View>
  );
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