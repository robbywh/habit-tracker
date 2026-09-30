import { FlatList, Text, View } from 'react-native';

import { HabitListItem } from '@/components/habit/habit-list-item';
import { useHabits } from '@/hooks/use-habits';
import type { Habit } from '@/lib/habit-types';

export default function TodayScreen() {
  const { habits, isLoading, isDoneToday, toggleToday } = useHabits();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (habits.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white px-8 dark:bg-black">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No habits yet
        </Text>
        <Text className="text-center text-gray-500 dark:text-gray-400">
          Add one from the Manage Habits tab to get started.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        renderItem={({ item }: { item: Habit }) => (
          <HabitListItem habit={item} done={isDoneToday(item)} onToggle={toggleToday} />
        )}
      />
    </View>
  );
}
