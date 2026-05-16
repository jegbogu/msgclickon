import FeatureCard from "./FeatureCard";

export default function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <FeatureCard
        badge="5 channels available"
        icon="🎂"
        title="Auto birthday message"
        description="Set up automatic birthday messages via Email, WhatsApp, SMS, Slack or auto-post on social media. Full message builder included."
      />

      <FeatureCard
        badge="CSV upload"
        icon="💡"
        title="Inspiration series"
        description="Upload a CSV of daily messages and drip them automatically to your selected contact over days, weeks or months."
      />

      <FeatureCard
        badge="Escalation included"
        icon="⏰"
        title="Event reminder"
        description="Remind users about domain expiries, renewals, contracts or any event. Escalation follow-ups fire automatically if unread."
      />

      <FeatureCard
        badge="For yourself"
        icon="📌"
        title="Personal reminder"
        description="Set reminders for yourself — learning goals, tasks, habits, prayer times. Each with its own schedule, channel and message."
        active
      />
    </div>
  );
}