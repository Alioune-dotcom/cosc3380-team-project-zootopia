import { Routes, Route } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Signup from './pages/Signup.jsx'
import Checkout from './pages/Checkout.jsx'
import './App.css'
import Animals from './pages/Animals.jsx'
import {
  ReportsHub,
  RevenueReports,
  CustomerReports,
  OperationsReports,
} from './pages/Reports.jsx'
import Products from './pages/Products.jsx'
import Species from './pages/Species.jsx'
import CustomerLayout from './components/CustomerLayout.jsx'
import MyTransactions from './pages/MyTransactions.jsx'
import CustomerEnclosures from './pages/CustomerEnclosures.jsx'
import CustomerAttractions from './pages/CustomerAttractions.jsx'
import Employees from './pages/Employees.jsx'
import Customers from './pages/Customers.jsx'
import Enclosures from './pages/Enclosures.jsx'
import Attractions from './pages/Attractions.jsx'
import Closures from './pages/Closures.jsx'
import NewSale from './pages/NewSale.jsx'
import CustomerLogin from './pages/CustomerLogin.jsx'
import OnlineShop from './pages/OnlineShop.jsx'
import Shops from './pages/Shops.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/customer-login" element={<CustomerLogin />} />

      <Route element={<CustomerLayout />}>
        <Route path="/enclosures" element={<CustomerEnclosures />} />
        <Route path="/attractions" element={<CustomerAttractions />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/shop" element={<OnlineShop />} />
        <Route path="/my-transactions" element={<MyTransactions />} />
        <Route path="/my-transactions/:id" element={<MyTransactions />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/animals" element={<Animals />} />
        <Route path="/species" element={<Species />} />
        <Route path="/staff/enclosures" element={<Enclosures />} />
        <Route path="/staff/enclosures/:id" element={<Enclosures />} />
        <Route path="/staff/attractions" element={<Attractions />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/closures" element={<Closures />} />
        <Route path="/shops" element={<Shops />} />
        <Route path="/products" element={<Products />} />
        <Route path="/new-sale" element={<NewSale />} />
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/revenue" element={<RevenueReports />} />
        <Route path="/reports/customers" element={<CustomerReports />} />
        <Route path="/reports/operations" element={<OperationsReports />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  )
}

export default App
