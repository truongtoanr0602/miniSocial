import React from "react";
import { TextInput, View, Text, StyleSheet, ViewStyle } from "react-native";
import { palette } from "../../theme";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  style?: ViewStyle;
  onSubmitEditing?: () => void;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  icon,
  rightElement,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize,
  editable = true,
  multiline = false,
  numberOfLines,
  error,
  style,
  onSubmitEditing,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        {icon ? icon : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onSubmitEditing={onSubmitEditing}
          style={[styles.input, multiline ? styles.multilineInput : null]}
        />
        {rightElement ? rightElement : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: palette.ink, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.inputBg,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputError: { borderColor: palette.danger },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: palette.ink,
    marginLeft: 12,
  },
  multilineInput: {
    height: "auto",
    minHeight: 80,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  errorText: { color: palette.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
});
