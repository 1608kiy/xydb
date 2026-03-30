
        function populateProfile(user) {
          if (!user) return;
          try { document.getElementById('user-name').value = user.nickname || ''; } catch (e) {}
          try { document.getElementById('user-email').textContent = user.email || ''; } catch (e) {}
          try { document.getElementById('user-phone').textContent = user.phone || ''; } catch (e) {}
          try { if (user.avatarUrl) document.getElementById('profile-avatar').src = user.avatarUrl; } catch (e) {}
        }

        // duplicate legacy DOMContentLoaded bindings removed; main bootstrap below handles profile init.
      
