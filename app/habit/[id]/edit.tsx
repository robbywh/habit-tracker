import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit/habit-form';
import { useHabits } from '@/hooks/use-habits';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, update } = useHabits();
  const habit = habits.find((item) => item.id === id);

  if (!habit) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-8 dark:bg-black">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Habit not found
        </Text>
        <Text
          onPress={() => router.back()}
          className="text-base text-blue-500 dark:text-blue-400">
          Go back
        </Text>
      </View>
    );
  }

  const handleSubmit = (values: HabitFormValues) => {
    update(habit.id, values);
    router.back();
  };

  return (
    <HabitForm
      submitLabel="Save Changes"
      initialValues={{ name: habit.name, color: habit.color }}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
