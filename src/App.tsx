import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { LevelDetails, Roadmap } from './pages/Roadmap';
import { MistakeReview, PracticeChooser, TopicPractice } from './pages/Practice';
import { ExamRunner, ExamStart } from './pages/Exam';
import { ExamResults } from './pages/ExamResults';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

import { SqlDashboard } from './pages/sql/SqlDashboard';
import { SqlLevelPage } from './pages/sql/SqlLevel';
import { SqlTopicPage } from './pages/sql/SqlTopic';
import { SqlReview, SqlTopicPractice } from './pages/sql/SqlPractice';
import {
  SqlCombinationPractice,
  SqlCombinations,
  SqlJoinLab,
  SqlJoinPractice,
} from './pages/sql/SqlLabs';
import { SqlWorkbench } from './pages/sql/SqlWorkbench';
import { SqlTests } from './pages/sql/SqlTests';
import { SqlExamRunner, SqlExamStart, SqlTopicExamStart } from './pages/sql/SqlExam';
import { SqlResults } from './pages/sql/SqlResults';
import { SqlProgressPage } from './pages/sql/SqlProgress';

export function App() {
  return (
    <AppShell>
      <Routes>
        {/* ------------------------------------------- Programming major */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/level/:levelId" element={<LevelDetails />} />

        <Route path="/practice" element={<PracticeChooser />} />
        <Route path="/practice/:topicId" element={<TopicPractice />} />
        <Route path="/review" element={<MistakeReview />} />

        {/* /exam shows the live exam when one is active, otherwise the chooser. */}
        <Route path="/exam" element={<ExamRunner />} />
        <Route path="/exam/start/:topicId" element={<ExamStart />} />

        <Route path="/results" element={<ExamResults />} />
        <Route path="/results/:resultId" element={<ExamResults />} />

        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />

        {/* --------------------------------------------------- SQL major */}
        <Route path="/sql" element={<SqlDashboard />} />
        <Route path="/sql/level/:levelId" element={<SqlLevelPage />} />
        <Route path="/sql/topic/:topicId" element={<SqlTopicPage />} />
        <Route path="/sql/practice/:topicId" element={<SqlTopicPractice />} />
        <Route path="/sql/review" element={<SqlReview />} />

        <Route path="/sql/joins" element={<SqlJoinLab />} />
        <Route path="/sql/joins/practice" element={<SqlJoinPractice />} />
        <Route path="/sql/combinations" element={<SqlCombinations />} />
        <Route path="/sql/combinations/practice" element={<SqlCombinationPractice />} />
        <Route path="/sql/workbench" element={<SqlWorkbench />} />

        <Route path="/sql/tests" element={<SqlTests />} />
        {/* /sql/exam shows the live exam when one is active, otherwise the list. */}
        <Route path="/sql/exam" element={<SqlExamRunner />} />
        <Route path="/sql/exam/start/topic/:topicId" element={<SqlTopicExamStart />} />
        <Route path="/sql/exam/start/:configId" element={<SqlExamStart />} />

        <Route path="/sql/results" element={<SqlResults />} />
        <Route path="/sql/results/:resultId" element={<SqlResults />} />
        <Route path="/sql/progress" element={<SqlProgressPage />} />

        {/* Legacy/typo convenience redirect. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
