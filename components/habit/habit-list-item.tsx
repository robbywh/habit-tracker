import { Pressable, Text, View } from 'react-native';

import { Checkbox } from '@/components/ui/checkbox';
import type { Habit } from '@/lib/habit-types';

type Props = {
  habit: Habit;
  done: boolean;
  onToggle: (id: string) => void;
};

export function HabitListItem({ habit, done, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(habit.id)}
      className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <View className="flex-row items-center gap-3">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: habit.color }} />
        <Text className="text-base text-gray-900 dark:text-gray-100">{habit.name}</Text>
      </View>
      <Checkbox checked={done} onToggle={() => onToggle(habit.id)} color={habit.color} />
    </Pressable>
  );
}
