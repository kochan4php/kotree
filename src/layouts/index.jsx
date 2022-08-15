const Layout = ({ children }) => (
  <div className="w-full md:max-w-5xl mx-auto bg-pink-700 min-h-screen flex flex-col items-center justify-center">
    <main>{children}</main>
  </div>
);

export default Layout;
