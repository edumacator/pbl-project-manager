
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassDetail from './pages/ClassDetail';
import CreateProject from './pages/CreateProject';
import TeacherStudentDetail from './pages/TeacherStudentDetail';
import ProjectBoard from './pages/ProjectBoard';
import StudentDashboard from './pages/student/Dashboard';
import PeerReviewWorkspace from './pages/student/PeerReviewWorkspace';
import { StudentProjectBoard } from './pages/student/ProjectBoard';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import UserManagement from './pages/admin/UserManagement';
import ClassOverview from './pages/admin/ClassOverview';
import Calendar from './pages/Calendar';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        <Route path="/" element={<ProtectedRoute />} >
                            <Route element={<Layout />}>
                                <Route index element={<Navigate to="/login" replace />} />

                                {/* Teacher & Admin Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
                                    <Route path="teacher" element={<Navigate to="/teacher/dashboard" replace />} />
                                    <Route path="teacher/dashboard" element={<TeacherDashboard />} />
                                    <Route path="classes/:id" element={<ClassDetail />} />
                                    <Route path="teacher/student-detail" element={<TeacherStudentDetail />} />
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

                                {/* Shared Routes */}
                                <Route path="calendar" element={<Calendar />} />
                            </Route>
                        </Route>

                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route element={<AdminLayout />}>
                                <Route path="dashboard" element={<AdminOverview />} />
                                <Route path="users" element={<UserManagement />} />
                                <Route path="classes" element={<ClassOverview />} />
                                <Route path="stats" element={<AdminOverview />} />
                            </Route>
                        </Route>

                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>
                </BrowserRouter>
                <ToastContainer />
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
