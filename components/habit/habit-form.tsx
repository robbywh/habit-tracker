import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { DEFAULT_HABIT_COLOR, HABIT_COLORS } from '@/constants/habit-colors';

export type HabitFormValues = {
  name: string;
  color: string;
};

type Props = {
  /** Pre-fills the form; omitted (undefined) for create, provided for edit. */
  initialValues?: HabitFormValues;
  /** Called only when the form is valid and the user tapped Save. */
  onSubmit: (values: HabitFormValues) => void;
  /** Called when the user cancels/dismisses without saving. */
  onCancel: () => void;
  /** "Create Habit" vs "Save Changes" — lets the two screens reuse one component with different copy. */
  submitLabel: string;
};

const MAX_NAME_LENGTH = 50;

export function HabitForm({ initialValues, onSubmit, onCancel, submitLabel }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [color, setColor] = useState<string>(initialValues?.color ?? DEFAULT_HABIT_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0 && trimmedName.length <= MAX_NAME_LENGTH;

  const handleSubmit = useCallback(() => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit({ name: trimmedName, color });
  }, [color, isSubmitting, isValid, onSubmit, trimmedName]);

  return (
    <View className="flex-1 gap-6 bg-white px-4 py-6 dark:bg-black">
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Drink water"
          placeholderTextColor="#9CA3AF"
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Color</Text>
        <View className="flex-row flex-wrap gap-3">
          {HABIT_COLORS.map((swatch) => (
            <Pressable
              key={swatch}
              onPress={() => setColor(swatch)}
              accessibilityRole="button"
              accessibilityLabel={`Color ${swatch}`}
              accessibilityState={{ selected: color === swatch }}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: swatch }}>
              {color === swatch ? (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  tintColor="white"
                  size={18}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!isValid || isSubmitting}
        className={`items-center rounded-lg py-3 ${
          isValid && !isSubmitting ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
        }`}>
        <Text className="text-base font-semibold text-white">{submitLabel}</Text>
      </Pressable>

      <Pressable onPress={onCancel} className="items-center py-2">
        <Text className="text-base text-gray-500 dark:text-gray-400">Cancel</Text>
      </Pressable>
    </View>
  );
}
