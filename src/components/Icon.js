/**
 * src/components/Icon.js
 *
 * Centralized Icon component powered by react-native-vector-icons.
 * Defaults to MaterialCommunityIcons, supporting Ionicons, MaterialIcons, Feather.
 */
import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

const Icon = ({
  name,
  size = 20,
  color,
  style,
  family = 'MaterialCommunityIcons',
}) => {
  switch (family) {
    case 'Ionicons':
      return <Ionicons name={name} size={size} color={color} style={style} />;
    case 'MaterialIcons':
      return <MaterialIcons name={name} size={size} color={color} style={style} />;
    case 'Feather':
      return <Feather name={name} size={size} color={color} style={style} />;
    case 'MaterialCommunityIcons':
    default:
      return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
  }
};

export { MaterialCommunityIcons, MaterialIcons, Ionicons, Feather };
export default Icon;
