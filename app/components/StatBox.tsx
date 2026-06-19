import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type StatBoxProps = {
  title: string;
  value: number | string;
  onPress?: () => void;
  onEdit?: () => void;
};

export const StatBox: React.FC<StatBoxProps> = ({ title, value, onPress, onEdit }) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.box} onPress={onPress as any}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#1C1917',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    minWidth: 100,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  title: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  value: { color: '#C5A059', fontSize: 20, fontWeight: '800', marginTop: 4 },
  editBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#C5A059', borderRadius: 6 },
  editBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
