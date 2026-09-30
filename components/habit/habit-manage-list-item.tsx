import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import type { Habit } from '@/lib/habit-types';

type Props = {
  habit: Habit;
  /** Fires when the row body is tapped — navigates to edit. */
  onPress: (id: string) => void;
  /** Fires when the trailing delete icon is tapped — triggers the confirmation flow. */
  onDelete: (id: string) => void;
};

export function HabitManageListItem({ habit, onPress, onDelete }: Props) {
  return (
    <Pressable
      onPress={() => onPress(habit.id)}
      className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <View className="flex-1 flex-row items-center gap-3 pr-3">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: habit.color }} />
        <Text numberOfLines={1} className="flex-1 text-base text-gray-900 dark:text-gray-100">
          {habit.name}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(habit.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${habit.name}`}
        className="h-7 w-7 items-center justify-center">
        <SymbolView
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          tintColor="#EF4444"
          size={20}
        />
      </Pressable>
    </Pressable>
  );
}
