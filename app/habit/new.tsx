import { router } from 'expo-router';

import { HabitForm, type HabitFormValues } from '@/components/habit/habit-form';
import { useHabits } from '@/hooks/use-habits';

export default function NewHabitScreen() {
  const { create } = useHabits();

  const handleSubmit = (values: HabitFormValues) => {
    create(values);
    router.back();
  };

  return (
    <HabitForm submitLabel="Create Habit" onSubmit={handleSubmit} onCancel={() => router.back()} />
  );
}
