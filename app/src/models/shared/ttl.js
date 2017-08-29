var TTL = module.exports = {
  LOW: 'LOW',
  INVALID: 'INVALID',
  HIGH: 'HIGH',

  LOW_VOLTAGE: 0,
  INVALID_VOLTAGE: 1.5,
  HIGH_VOLTAGE: 3,

  getVoltageLogicLevel: function (voltage) {
    return voltage <= 0.8 ? TTL.LOW : (voltage < 2 ? TTL.INVALID : TTL.HIGH);
  },

  getBooleanLogicLevel: function (boolean) {
    return boolean ? TTL.HIGH : TTL.LOW;
  },

  getBooleanVoltage: function (boolean) {
    return boolean ? TTL.HIGH_VOLTAGE : TTL.LOW_VOLTAGE;
  },

  getVoltage: function (logicLevel) {
    if (!TTL.VOLTAGE_MAP) {
      TTL.VOLTAGE_MAP = {
        'LOW': TTL.LOW_VOLTAGE,
        'INVALID': TTL.INVALID_VOLTAGE,
        'HIGH': TTL.HIGH_VOLTAGE
      };
    }
    return TTL.VOLTAGE_MAP[logicLevel];
  },

  isInvalid: function (logicLevel) {
    return logicLevel === TTL.INVALID;
  },

  isLow: function (logicLevel) {
    return logicLevel === TTL.LOW;
  },

  isHigh: function (logicLevel) {
    return logicLevel === TTL.HIGH;
  },

  getColor: function (voltage) {
    if (!TTL.COLOR_MAP) {
      TTL.COLOR_MAP = {
        'LOW': 'blue',
        'INVALID': '#777',
        'HIGH': 'red'
      };
    }
    return TTL.COLOR_MAP[TTL.getVoltageLogicLevel(voltage)];
  }
};
