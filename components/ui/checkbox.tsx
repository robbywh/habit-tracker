import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

type Props = {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
};

export function Checkbox({ checked, onToggle, color = '#22c55e', size = 28, disabled = false }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      className="items-center justify-center rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: color,
        backgroundColor: checked ? color : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}>
      {checked ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor="white"
          size={Math.round(size * 0.6)}
        />
      ) : null}
    </Pressable>
  );
}
