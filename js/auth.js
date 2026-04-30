// ===================================================
// Auth — จัดการ Login, Logout, ตรวจสอบ session
// ===================================================

const buildAppUrl = (path) => new URL(path, window.location.origin).toString();

const Auth = {

    async signInWithGoogle() {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAppUrl('/dashboard.html')
        }
      });
      if (error) {
        Toast.show('เข้าสู่ระบบไม่สำเร็จ: ' + error.message, 'error');
      }
    },
  
    async signOut() {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        Toast.show('ออกจากระบบไม่สำเร็จ', 'error');
        return;
      }
      window.location.href = buildAppUrl('/index.html');
    },
  
    async getCurrentUser() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    },
  
    async getSession() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      return session;
    },
  
    async requireAuth() {
      const session = await this.getSession();
      if (!session) {
        window.location.href = buildAppUrl('/index.html');
        return null;
      }
      return session;
    },
  
    async redirectIfLoggedIn() {
      const session = await this.getSession();
      if (session) {
        window.location.href = buildAppUrl('/dashboard.html');
      }
    },
  
    onAuthStateChange(callback) {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
    }
  };
