const Anthropic = require('@anthropic-ai/sdk');
const { athleteProfile, estimateTSS, getZoneForHR, getZoneForPower } = require('./athlete-profile');

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}u${m.toString().padStart(2, '0')}` : `${m}min`;
}

function formatDistance(meters) {
  return (meters / 1000).toFixed(1) + ' km';
}

function formatActivityForPrompt(activity) {
  const tss = estimateTSS(activity);
  const zone = activity.average_watts
    ? getZoneForPower(activity.average_watts)
    : getZoneForHR(activity.average_heartrate);

  const date = new Date(activity.start_date_local).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  let line = `- ${date}: ${activity.type} "${activity.name}"`;
  line += ` | Duur: ${formatDuration(activity.moving_time)}`;
  line += ` | Afstand: ${formatDistance(activity.distance)}`;

  if (activity.average_heartrate) {
    line += ` | Gem HR: ${Math.round(activity.average_heartrate)} bpm (max: ${activity.max_heartrate || '?'})`;
  }
  if (activity.average_watts) {
    line += ` | Gem Watt: ${Math.round(activity.average_watts)}W (max: ${activity.max_watts || '?'}W)`;
    if (activity.weighted_average_watts) {
      line += ` | NP: ${Math.round(activity.weighted_average_watts)}W`;
    }
  }
  if (activity.suffer_score) {
    line += ` | Suffer score: ${activity.suffer_score}`;
  }
  if (zone) {
    line += ` | Hoofdzone: Z${zone.id} ${zone.name}`;
  }
  line += ` | TSS (geschat): ${tss}`;

  return line;
}

function buildProfileSection() {
  const p = athleteProfile;
  const ph = p.physiology;

  return `## Atleet Profiel
Naam: ${p.name}
Leeftijd: ${p.age} jaar | Gewicht: ${p.weight} kg | Sport: ${p.sport}
Testdatum: ${p.testDate} @ ${p.testLocation}

### Fysiologische Parameters
- VO2max: ${ph.vo2max} ml/min/kg
- Max vermogen: ${ph.maxPower}W (${ph.maxPowerPerKg} W/kg)
- Max hartslag: ${ph.maxHR} bpm
- Aeroob drempel: ${ph.aerobicThreshold.power}W / ${ph.aerobicThreshold.hr} bpm / ${ph.aerobicThreshold.wPerKg} W/kg (${ph.aerobicThreshold.percentOfMax}% van max)
- Anaeroob drempel: ${ph.anaerobicThreshold.power}W / ${ph.anaerobicThreshold.hr} bpm / ${ph.anaerobicThreshold.wPerKg} W/kg (${ph.anaerobicThreshold.percentOfMax}% van max)

### Trainingszones (HR / Vermogen)
${p.zones.map(z => `Z${z.id} ${z.name} (${z.label}): HR ${z.hrMin === 0 ? '<' + z.hrMax : z.hrMin + '-' + (z.hrMax === 999 ? '+' : z.hrMax)} bpm / ${z.powerMin === 0 ? '<' + z.powerMax : z.powerMin + '-' + (z.powerMax === 9999 ? '+' : z.powerMax)}W`).join('\n')}

### Sleutelinzichten
${p.keyInsights.map(i => `- ${i}`).join('\n')}

Typische week: ${p.typicalWeek.wednesday} + ${p.typicalWeek.sunday}
Stresscore: ${p.typicalWeek.stressScore}/10 (herstel is kritiek!)`;
}

async function getTrainingAdvice(activities) {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const activitiesText = activities.map(formatActivityForPrompt).join('\n');
  const profileText = buildProfileSection();

  const totalTSS = activities.reduce((sum, a) => sum + estimateTSS(a), 0);
  const avgTSS = Math.round(totalTSS / activities.length);

  const prompt = `${profileText}

## Laatste 10 Trainingen
${activitiesText}

**Totaal TSS (laatste 10 activiteiten): ${totalTSS} | Gemiddeld TSS per sessie: ${avgTSS}**

---

Op basis van dit atleetprofiel en de recente trainingsdata: wat is de ideale volgende trainingssessie en het ideale trainingsadvies voor de komende week?

Wees specifiek met:
- Zones, duur en timing voor de volgende sessie
- Weekplanning met dag-voor-dag advies
- Of herstel eerst nodig is (geef duidelijk aan als de atleet overbelast lijkt)
- Hoe de aerobe basis (zone 2-3) verder ontwikkeld kan worden
- Aanpassingen rekening houdend met de vaste clubrit op woensdag en groepsrit/race op zondag

Geef je antwoord in het Nederlands. Gebruik structuur met duidelijke koppen.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    system: 'Je bent een professionele wielrencoach gespecialiseerd in fysiologie en trainingsplanning. Je geeft concrete, wetenschappelijk onderbouwde trainingsadviezen op basis van Strava-data en fysiologische testresultaten. Schrijf altijd in het Nederlands.'
  });

  return message.content[0].text;
}

module.exports = { getTrainingAdvice, formatActivityForPrompt };
