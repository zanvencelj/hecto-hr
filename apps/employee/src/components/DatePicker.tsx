import { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

const ITEM_HEIGHT = 48;

interface ColProps {
  items: string[];
  selected: number;
  onSelect: (index: number) => void;
  openKey: number;
}

function Col({ items, selected, onSelect, openKey }: ColProps) {
  const ref = useRef<ScrollView>(null);
  const isDragging = useRef(false);

  // Scroll to selected position each time picker opens (openKey changes)
  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: selected * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [openKey]);

  const snapToIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = e.nativeEvent.contentOffset.y;
    const idx = Math.round(raw / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    onSelect(clamped);
    // Snap scroll position precisely
    ref.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: false });
  };

  return (
    <View style={{ flex: 1, height: ITEM_HEIGHT * 5, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * 2,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: '#2563eb',
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate={Platform.OS === 'android' ? 0.85 : 'fast'}
        scrollEventThrottle={16}
        nestedScrollEnabled
        onScrollBeginDrag={() => { isDragging.current = true; }}
        onMomentumScrollEnd={snapToIndex}
        onScrollEndDrag={(e) => {
          isDragging.current = false;
          // Android often skips onMomentumScrollEnd for slow drags
          snapToIndex(e);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      >
        {items.map((item, i) => (
          <View
            key={item}
            style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: 18,
                color: i === selected ? '#111827' : '#9ca3af',
                fontWeight: i === selected ? '600' : '400',
              }}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const PICKER_HEADER = (onCancel: () => void, onConfirm: () => void) => (
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
    <TouchableOpacity onPress={onConfirm} hitSlop={8}>
      <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '600' }}>Confirm</Text>
    </TouchableOpacity>
  </View>
);

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  children: React.ReactNode;
}

export function DatePicker({ value, onChange, minimumDate, children }: DatePickerProps) {
  const now = new Date();
  const initial = value ?? now;
  const [visible, setVisible] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const [day, setDay] = useState(initial.getDate() - 1);
  const [month, setMonth] = useState(initial.getMonth());
  const [yearIdx, setYearIdx] = useState(0);

  const years = Array.from({ length: 10 }, (_, i) => String(now.getFullYear() - 9 + i));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysCount = getDaysInMonth(Number(years[yearIdx]) ?? now.getFullYear(), month);
  const days = Array.from({ length: daysCount }, (_, i) => String(i + 1).padStart(2, '0'));

  const open = () => {
    const v = value ?? now;
    setDay(v.getDate() - 1);
    setMonth(v.getMonth());
    const yIdx = years.indexOf(String(v.getFullYear()));
    setYearIdx(yIdx >= 0 ? yIdx : years.length - 1);
    setOpenKey((k) => k + 1);
    setVisible(true);
  };

  const confirm = () => {
    const selectedYear = Number(years[yearIdx]);
    const d = new Date(selectedYear!, month, day + 1);
    if (minimumDate && d < minimumDate) return;
    onChange(d);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={open}>{children}</TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={{ backgroundColor: '#fff', paddingBottom: 24 }}>
              {PICKER_HEADER(() => setVisible(false), confirm)}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
                <Col items={days} selected={day} onSelect={setDay} openKey={openKey} />
                <Col items={months} selected={month} onSelect={setMonth} openKey={openKey} />
                <Col items={years} selected={yearIdx} onSelect={setYearIdx} openKey={openKey} />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  const [openKey, setOpenKey] = useState(0);
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const open = () => {
    setHour(value.getHours());
    setMinute(value.getMinutes());
    setOpenKey((k) => k + 1);
    setVisible(true);
  };

  const confirm = () => {
    const d = new Date(value);
    d.setHours(hour, minute, 0, 0);
    onChange(d);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={open}>{children}</TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={{ backgroundColor: '#fff', paddingBottom: 24 }}>
              {PICKER_HEADER(() => setVisible(false), confirm)}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
                <Col items={hours} selected={hour} onSelect={setHour} openKey={openKey} />
                <Col items={minutes} selected={minute} onSelect={setMinute} openKey={openKey} />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
