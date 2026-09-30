import { useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';

import { HabitManageListItem } from '@/components/habit/habit-manage-list-item';
import { useHabits } from '@/hooks/use-habits';
import type { Habit } from '@/lib/habit-types';

export default function ManageHabitsScreen() {
  const { habits, isLoading } = useHabits();

  // Edit navigation and delete confirmation land in Task 5, once
  // `app/habit/[id]/edit.tsx` exists — kept as no-ops here so the row's
  // affordances exist structurally without wiring an unfinished route.
  const handlePress = useCallback((_id: string) => {}, []);
  const handleDelete = useCallback((_id: string) => {}, []);

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
          Tap + to add your first habit.
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
          <HabitManageListItem habit={item} onPress={handlePress} onDelete={handleDelete} />
        )}
      />
    </View>
  );
}
