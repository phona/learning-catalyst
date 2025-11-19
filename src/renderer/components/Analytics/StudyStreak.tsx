


import React from 'react';

interface StudyStreakProps {
  streakDays: number;
  lastStudyDate?: Date;
  goalDays?: number;
  className?: string;
}

export const StudyStreak: React.FC<StudyStreakProps> = ({
  streakDays,
  lastStudyDate,
  goalDays = 7,
  className = ''
}) => {
  const getStreakMessage = (): string => {
    if (streakDays === 0) return 'Start your learning journey!';
    if (streakDays === 1) return 'Great start! Keep it going!';
    if (streakDays < 7) return `${streakDays} day streak - Building momentum!`;
    if (streakDays < 14) return `${streakDays} day streak - You're on fire!`;
    if (streakDays < 30) return `${streakDays} day streak - Incredible dedication!`;
    return `${streakDays} day streak - Learning master!`;
  };

  const getStreakEmoji = (): string => {
    if (streakDays === 0) return '🌱';
    if (streakDays < 3) return '🌟';
    if (streakDays < 7) return '🔥';
    if (streakDays < 14) return '💪';
    if (streakDays < 30) return '🚀';
    return '🏆';
  };

  const progressToGoal = Math.min((streakDays / goalDays) * 100, 100);
  const today = new Date().toDateString();
  const studiedToday = lastStudyDate?.toDateString() === today;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Streak</h3>
        <span className="text-3xl">{getStreakEmoji()}</span>
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {streakDays}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          day{streakDays !== 1 ? 's' : ''} in a row
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-2">
          {getStreakMessage()}
        </p>
        {lastStudyDate && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Last studied:{' '}
            <span data-testid="last-study-date">
              {lastStudyDate.toLocaleDateString('en-US')}
            </span>
            {studiedToday && <span aria-label="Studied today"> ✓</span>}
          </p>
        )}
      </div>

      {/* Goal Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Weekly Goal</span>
          <span className="text-gray-900 dark:text-gray-100">{streakDays}/{goalDays} days</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressToGoal}%` }}
          />
        </div>
        {streakDays >= goalDays && (
          <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
            🎉 Weekly goal achieved!
          </div>
        )}
      </div>

      {/* Mini Calendar */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">This Week</div>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
            const date = new Date();
            const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
            date.setDate(date.getDate() - (6 - dayIndex));
            const isStudied = dayIndex >= (7 - streakDays) && studiedToday && dayIndex === 6;
            const isPast = dayIndex < 6;

            return (
              <div
                key={day}
                className={`
                  text-center text-xs py-1 rounded
                  ${isStudied ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}
                  ${!isStudied && isPast ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : ''}
                  ${!isStudied && !isPast ? 'text-gray-500 dark:text-gray-400' : ''}
                `}
                title={date.toLocaleDateString()}
              >
                {day[0]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
