import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import GroupDetailPage from './pages/GroupDetailPage'
import NewGroupPage from './pages/NewGroupPage'
import NewExpensePage from './pages/NewExpensePage'
import EditExpensePage from './pages/EditExpensePage'
import InviteAcceptPage from './pages/InviteAcceptPage'
import DemoPage from './pages/DemoPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/entrar', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
  { path: '/conheca-mais', element: <DemoPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/grupos', element: <DashboardPage /> },
      { path: '/grupos/novo', element: <NewGroupPage /> },
      { path: '/grupos/:groupId', element: <GroupDetailPage /> },
      {
        path: '/grupos/:groupId/despesas/nova',
        element: <NewExpensePage />,
      },
      {
        path: '/grupos/:groupId/despesas/:expenseId/editar',
        element: <EditExpensePage />,
      },
    ],
  },
  { path: '/convite', element: <InviteAcceptPage /> },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
])
