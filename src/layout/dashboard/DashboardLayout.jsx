import React, { useState } from "react";
import { Layout } from "antd";
import Sidebar from "./Sidebar";
import HeaderBar from "./Header";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const { Content } = Layout;

const DashboardLayout = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isMessagesPage = location.pathname.includes("/messages");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Layout className="h-screen overflow-hidden">
      {" "}
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onLogout={handleLogout}
      />
      <Layout className="flex flex-col h-screen">
        <HeaderBar
          role={role}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        <Content
          className={`overflow-y-auto bg-white ${!isMessagesPage ? "p-8" : ""}`}
          style={{
            height: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
