export enum NodeName {
  TOPIC_PARSE = 'TopicParse',
  TITLE_GENERATE = 'TitleGenerate',
  PLAN = 'Plan',
  ASSESS = 'Assess',
  FAST_TRACK_QUIZ = 'FastTrackQuiz',
  // WAIT_QUIZ_ANSWER = 'WaitQuizAnswer', // REMOVED: merged into FAST_TRACK_QUIZ
  GRADE_QUIZ = 'GradeQuiz',
  TEACH = 'Teach',
  QA = 'QA',
  PRACTICE = 'Practice',
  // WAIT_PRACTICE = 'WaitPractice', // REMOVED: merged into PRACTICE
  EVALUATE = 'Evaluate',
  MASTERY_CHECK = 'MasteryCheck',
  REMEDIATE = 'Remediate',
  BREAKER = 'Breaker',
  COMPLETE = 'Complete',
}
