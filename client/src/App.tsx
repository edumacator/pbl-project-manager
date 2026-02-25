
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassDetail from './pages/ClassDetail';
import CreateProject from './pages/CreateProject';
import ProjectBoard from './pages/ProjectBoard';
import StudentDashboard from './pages/student/Dashboard';
import PeerReviewWorkspace from './pages/student/PeerReviewWorkspace';
import { StudentProjectBoard } from './pages/student/ProjectBoard';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route path="/" element={<ProtectedRoute />} >
                            <Route element={<Layout />}>
                                <Route index element={<Navigate to="/login" replace />} />

                                {/* Teacher Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                                    <Route path="teacher" element={<Navigate to="/teacher/dashboard" replace />} />
                                    <Route path="teacher/dashboard" element={<TeacherDashboard />} />
                                    <Route path="classes/:id" element={<ClassDetail />} />
                                    <Route path="projects/new" element={<CreateProject />} />
                                    <Route path="projects/:id/edit" element={<CreateProject />} />
                                    <Route path="projects/:id" element={<ProjectBoard />} />
                                </Route>

                                {/* Student Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                    <Route path="student" element={<Navigate to="/student/today" replace />} />
                                    <Route path="student/today" element={<StudentDashboard />} />
                                    <Route path="student/projects/:id" element={<StudentProjectBoard />} />
                                    <Route path="student/reviews/:assignmentId" element={<PeerReviewWorkspace />} />
                                </Route>
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
                <ToastContainer />
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
