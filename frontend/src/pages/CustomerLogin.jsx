import { Navigate } from 'react-router'

// old /customer-login url, everyone uses /login now
function CustomerLogin() {
  return <Navigate to="/login" replace />
}

export default CustomerLogin
