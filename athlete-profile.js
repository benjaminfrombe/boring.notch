// Hardcoded athlete physiological profile
const athleteProfile = {
  name: 'Benjamin Jacobs',
  age: 47,
  weight: 73, // kg
  sport: 'cyclist',
  testDate: '4-03-2026',
  testLocation: 'UZ Gent',

  physiology: {
    vo2max: 51.8, // ml/min/kg
    maxPower: 300, // W
    maxPowerPerKg: 4.1, // W/kg
    maxHR: 179, // bpm

    aerobicThreshold: {
      power: 177, // W
      hr: 130, // bpm
      wPerKg: 2.4,
      percentOfMax: 59
    },
    anaerobicThreshold: {
      power: 240, // W
      hr: 159, // bpm
      wPerKg: 3.3,
      percentOfMax: 80
    }
  },

  zones: [
    { id: 1, name: 'REC',  label: 'Recovery',          hrMin: 0,   hrMax: 115, powerMin: 0,   powerMax: 140 },
    { id: 2, name: 'EDT1', label: 'Endurance 1',        hrMin: 115, hrMax: 125, powerMin: 140, powerMax: 165 },
    { id: 3, name: 'EDT2', label: 'Endurance 2',        hrMin: 125, hrMax: 135, powerMin: 165, powerMax: 185 },
    { id: 4, name: 'IDT',  label: 'Intensive Endurance',hrMin: 135, hrMax: 155, powerMin: 185, powerMax: 230 },
    { id: 5, name: 'EIT1', label: 'Intensive 1',        hrMin: 155, hrMax: 163, powerMin: 230, powerMax: 250 },
    { id: 6, name: 'EIT2', label: 'Intensive 2',        hrMin: 163, hrMax: 173, powerMin: 250, powerMax: 280 },
    { id: 7, name: 'IIT',  label: 'Max Intensity',      hrMin: 173, hrMax: 999, powerMin: 280, powerMax: 9999 }
  ],

  keyInsights: [
    'Aerobic base (zone 2-3) is the weakest link at 59% of max — needs most development',
    'Typical week: intense club ride Wednesday evening + race/group ride Sunday morning',
    'Stress score: 9/10 — recovery is critical'
  ],

  typicalWeek: {
    wednesday: 'Intense club ride (evening)',
    sunday: 'Race or group ride (morning)',
    stressScore: 9
  }
};

/**
 * Determine zone for a given HR or power value
 */
function getZoneForHR(hr) {
  if (!hr || hr <= 0) return null;
  for (const zone of athleteProfile.zones) {
    if (hr >= zone.hrMin && hr < zone.hrMax) return zone;
  }
  return athleteProfile.zones[athleteProfile.zones.length - 1];
}

function getZoneForPower(power) {
  if (!power || power <= 0) return null;
  for (const zone of athleteProfile.zones) {
    if (power >= zone.powerMin && power < zone.powerMax) return zone;
  }
  return athleteProfile.zones[athleteProfile.zones.length - 1];
}

/**
 * Estimate TSS from activity data
 */
function estimateTSS(activity) {
  const durationHours = activity.moving_time / 3600;

  if (activity.average_watts && activity.average_watts > 0) {
    const ftp = athleteProfile.physiology.anaerobicThreshold.power;
    const intensityFactor = activity.average_watts / ftp;
    return Math.round(durationHours * intensityFactor * intensityFactor * 100);
  }

  if (activity.average_heartrate && activity.average_heartrate > 0) {
    const hrMax = athleteProfile.physiology.maxHR;
    const hrRatio = activity.average_heartrate / hrMax;
    return Math.round(durationHours * hrRatio * hrRatio * 100);
  }

  return Math.round(durationHours * 50); // fallback estimate
}

/**
 * Compute zone distribution based on avg HR and power
 */
function computeZoneDistribution(activity) {
  const zones = {};
  athleteProfile.zones.forEach(z => { zones[`Z${z.id}`] = 0; });

  const dominantZone = activity.average_watts
    ? getZoneForPower(activity.average_watts)
    : getZoneForHR(activity.average_heartrate);

  if (dominantZone) {
    zones[`Z${dominantZone.id}`] = 100;
  }

  return zones;
}

module.exports = { athleteProfile, getZoneForHR, getZoneForPower, estimateTSS, computeZoneDistribution };
