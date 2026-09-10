import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import RNDateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

interface PickerModalProps {
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  visible: boolean;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

/**
 * Android's native picker is a self-dismissing dialog (fires once, then closes)
 * so it's rendered directly, no wrapper chrome. iOS's inline spinner never
 * dismisses itself, so it needs a sheet with explicit Cancel/Confirm — same
 * shape the old custom wheel picker used, just backed by the real native control.
 */
function PickerModal({ mode, value, minimumDate, visible, onCancel, onConfirm }: PickerModalProps) {
  const [pending, setPending] = useState(value);

  if (!visible) return null;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selected) onConfirm(selected);
      else onCancel();
      return;
    }
    if (selected) setPending(selected);
  };

  if (Platform.OS === 'android') {
    return (
      <RNDateTimePicker
        value={value}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={{ backgroundColor: '#fff', paddingBottom: 24 }} onStartShouldSetResponder={() => true}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <TouchableOpacity onPress={onCancel} hitSlop={8}>
              <Text style={{ color: '#6b7280', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(pending)} hitSlop={8}>
              <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '600' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <RNDateTimePicker
            value={pending}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            onChange={handleChange}
            themeVariant="light"
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  children: React.ReactNode;
}

export function DatePicker({ value, onChange, minimumDate, children }: DatePickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>{children}</TouchableOpacity>
      <PickerModal
        mode="date"
        value={value ?? new Date()}
        minimumDate={minimumDate}
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={(date) => {
          setVisible(false);
          onChange(date);
        }}
      />
    </>
  );
}

export interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  children: React.ReactNode;
}

export function TimePicker({ value, onChange, children }: TimePickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>{children}</TouchableOpacity>
      <PickerModal
        mode="time"
        value={value}
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={(date) => {
          setVisible(false);
          onChange(date);
        }}
      />
    </>
  );
}
