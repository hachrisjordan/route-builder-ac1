import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import './App.css';
import FlightSearch from './pages/FlightSearch';
import NormalRouteBuilder from './pages/NormalRouteBuilder';

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Router>
      <Layout className="layout">
        <Header className="app-header">
          <div className="logo">Route Builder</div>
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={[window.location.pathname === '/normal' ? 'normal' : 'ac']}
            items={[
              {
                key: 'ac',
                label: <Link to="/ac">AC Route Builder</Link>,
              },
              {
                key: 'normal',
                label: <Link to="/normal">Normal Route Builder</Link>,
              },
            ]}
          />
        </Header>
        <Content className="app-content">
          <Routes>
            <Route path="/ac" element={<FlightSearch />} />
            <Route path="/normal" element={<NormalRouteBuilder />} />
            <Route path="/" element={<Navigate to="/ac" replace />} />
          </Routes>
        </Content>
        <Footer className="app-footer">
          Route Builder by Ha Nguyen @ 2025
        </Footer>
      </Layout>
    </Router>
  );
}

export default App;
