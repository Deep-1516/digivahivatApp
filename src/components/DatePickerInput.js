/**
 * src/components/DatePickerInput.js
 *
 * Custom visual Date Picker Component for React Native.
 * Features a calendar grid modal to pick YYYY-MM-DD dates without requiring native rebuilds.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const DatePickerInput = ({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date',
  containerStyle,
  error,
}) => {
  const { colors } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  // Calendar State
  const initialDate = value ? new Date(value) : new Date();
  const validInitial = !isNaN(initialDate.getTime()) ? initialDate : new Date();

  const [currentYear,  setCurrentYear]  = useState(validInitial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validInitial.getMonth());
  const [selectedDay,  setSelectedDay]  = useState(value ? validInitial.getDate() : null);

  const openPicker = () => {
    const d = value ? new Date(value) : new Date();
    const valid = !isNaN(d.getTime()) ? d : new Date();
    setCurrentYear(valid.getFullYear());
    setCurrentMonth(valid.getMonth());
    setSelectedDay(value ? valid.getDate() : null);
    setModalOpen(true);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay   = String(day).padStart(2, '0');
    const isoString      = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChangeDate(isoString);
    setModalOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
    const formattedMonth = String(now.getMonth() + 1).padStart(2, '0');
    const formattedDay   = String(now.getDate()).padStart(2, '0');
    onChangeDate(`${now.getFullYear()}-${formattedMonth}-${formattedDay}`);
    setModalOpen(false);
  };

  const handleClear = () => {
    setSelectedDay(null);
    onChangeDate('');
    setModalOpen(false);
  };

  // Build calendar matrix
  const daysInMonth  = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <TouchableOpacity
        style={[
          styles.inputBox,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
        onPress={openPicker}
        activeOpacity={0.7}>
        <Text style={[styles.inputText, { color: value ? colors.text : colors.textMuted }]}>
          {value ? value : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {/* ── Calendar Modal ── */}
      <Modal visible={modalOpen} animationType="fade" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                <Text style={[styles.navArrow, { color: colors.text }]}>◀</Text>
              </TouchableOpacity>

              <Text style={[styles.monthYearTitle, { color: colors.text }]}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                <Text style={[styles.navArrow, { color: colors.text }]}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Day Name Headers */}
            <View style={styles.dayHeaderRow}>
              {DAY_HEADERS.map((h) => (
                <Text key={h} style={[styles.dayHeaderCell, { color: colors.textMuted }]}>{h}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }
                const isSelected = selectedDay === day &&
                  validInitial.getFullYear() === currentYear &&
                  validInitial.getMonth() === currentMonth;

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colors.primary, borderRadius: 20 },
                    ]}
                    onPress={() => handleSelectDay(day)}>
                    <Text style={[
                      styles.dayCellText,
                      { color: isSelected ? '#fff' : colors.text },
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleClear}>
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleToday}>
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setModalOpen(false)}>
                <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label:     { fontSize: 13, fontWeight: '700', marginBottom: SPACING.xs },
  inputBox:  {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    borderWidth:       1.2,
    borderRadius:      12,
    paddingHorizontal: SPACING.md,
    paddingVertical:   12,
    minHeight:         48,
  },
  inputText:    { fontSize: 15, fontWeight: '500' },
  calendarIcon: { fontSize: 18 },
  error:        { fontSize: 12, marginTop: 4, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  modalContent: { width: '100%', maxWidth: 340, borderRadius: 24, padding: SPACING.md, elevation: 5 },
  monthHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  navArrowBtn:  { padding: 8 },
  navArrow:     { fontSize: 16, fontWeight: '800' },
  monthYearTitle:{ fontSize: 16, fontWeight: '800' },

  dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.xs },
  dayHeaderCell:{ width: 40, textAlign: 'center', fontSize: 12, fontWeight: '700' },

  daysGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell:     { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center' },
  dayCellText: { fontSize: 14, fontWeight: '600' },

  actionsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.xs, borderTopWidth: 0.5, borderTopColor: '#ccc' },
  actionBtn:      { padding: 8 },
  actionBtnText:  { fontSize: 14, fontWeight: '700' },
});

export default DatePickerInput;
